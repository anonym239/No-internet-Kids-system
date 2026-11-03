/* Nova KI – Rechen-Thread (Web Worker, ES-Modul)
 * Läuft komplett lokal: Modelle kommen aus /models/ (vorinstalliert) oder aus dem
 * Geräte-Speicher (einmal mit Erlaubnis heruntergeladen). Es wird NIE etwas ins Internet geschickt.
 */
import {
  env,
  AutoTokenizer,
  AutoProcessor,
  AutoModelForCausalLM,
  AutoModelForImageTextToText,
  TextStreamer,
  InterruptableStoppingCriteria,
  RawImage,
} from '../../vendor/transformers/transformers.min.js';

env.allowLocalModels = true;
env.localModelPath = new URL('../../models/', import.meta.url).pathname; // reiner Pfad (keine URL), sonst sucht die Bibliothek nicht lokal
env.allowRemoteModels = false; // niemals selbst nachladen – Downloads macht nur der Installer nach Zustimmung
env.useBrowserCache = true;
env.backends.onnx.wasm.wasmPaths = new URL('../../vendor/transformers/', import.meta.url).href;
env.backends.onnx.wasm.numThreads = self.crossOriginIsolated ? Math.max(1, Math.min(4, (navigator.hardwareConcurrency || 2) - 1)) : 1;

/* Modelle, bei denen der Prozessor zuerst das Bild und dann den Text erwartet */
const IMAGE_FIRST = new Set(['lfm2_vl', 'lfm3_vl']);

let cur = null; // { key, id, kind, model, tokenizer, processor, type, device }
let stopper = null;
let busy = false;

const post = (m) => self.postMessage(m);

async function load({ id, kind, dtype, device }) {
  const key = id + '|' + JSON.stringify(dtype) + '|' + device;
  if (cur && cur.key === key) return post({ type: 'ready', id, device: cur.device });
  if (cur) { try { await cur.model.dispose(); } catch (e) { /* egal */ } cur = null; }
  const progress_callback = (p) => {
    if (p.status === 'progress' || p.status === 'initiate' || p.status === 'done') post({ type: 'progress', id, file: p.file, loaded: p.loaded || 0, total: p.total || 0, status: p.status });
  };
  const tryLoad = async (dev) => {
    const opts = { dtype, device: dev, progress_callback };
    if (kind === 'vlm') {
      const processor = await AutoProcessor.from_pretrained(id, { progress_callback });
      const model = await AutoModelForImageTextToText.from_pretrained(id, opts);
      return { processor, tokenizer: processor.tokenizer, model };
    }
    const tokenizer = await AutoTokenizer.from_pretrained(id, { progress_callback });
    const model = await AutoModelForCausalLM.from_pretrained(id, opts);
    return { tokenizer, model };
  };
  // Grafikkarte nur nutzen, wenn wirklich ein Adapter verfügbar ist
  if (device === 'webgpu') {
    let ok = false;
    try { ok = !!(self.navigator.gpu && (await self.navigator.gpu.requestAdapter())); } catch (e) { ok = false; }
    if (!ok) device = 'wasm';
  }
  let r, used = device;
  try {
    r = await tryLoad(device);
  } catch (e) {
    if (device === 'wasm') throw e;
    post({ type: 'log', message: 'WebGPU nicht nutzbar, nutze Prozessor: ' + e.message });
    used = 'wasm';
    r = await tryLoad('wasm');
  }
  cur = { key, id, kind, device: used, type: r.model.config && r.model.config.model_type, ...r };
  post({ type: 'ready', id, device: used });
}

/* Wandelt Chat-Nachrichten in das Format für Bild-Text-Modelle um */
function vlmMessages(messages, hasImage) {
  const out = messages.map((m) => ({ role: m.role, content: [{ type: 'text', text: m.content }] }));
  if (hasImage) {
    for (let i = out.length - 1; i >= 0; i--) if (out[i].role === 'user') { out[i].content.unshift({ type: 'image' }); break; }
  }
  return out;
}

async function generate({ reqId, messages, image, maxTokens = 400, temperature = 0.6 }) {
  if (!cur) throw new Error('Kein Modell geladen');
  busy = true;
  stopper = new InterruptableStoppingCriteria();
  const { model, tokenizer, processor, kind, type } = cur;
  let inputs;
  if (kind === 'vlm') {
    let img = null;
    if (image) img = await RawImage.fromBlob(image);
    let msgs = vlmMessages(messages, !!img);
    let prompt;
    try { prompt = processor.apply_chat_template(msgs, { add_generation_prompt: true }); }
    catch (e) {
      // Manche Vorlagen kennen keine System-Rolle: Systemtext in die erste Nutzer-Nachricht verschieben
      const sys = msgs.filter((m) => m.role === 'system').map((m) => m.content[0].text).join('\n');
      msgs = msgs.filter((m) => m.role !== 'system');
      const first = msgs.find((m) => m.role === 'user');
      if (first && sys) first.content.push({ type: 'text', text: '\n(' + sys + ')' });
      prompt = processor.apply_chat_template(msgs, { add_generation_prompt: true });
    }
    if (img) inputs = IMAGE_FIRST.has(type) ? await processor(img, prompt, { add_special_tokens: false }) : await processor(prompt, img, { add_special_tokens: false });
    else inputs = tokenizer(prompt, { add_special_tokens: false });
  } else {
    inputs = tokenizer.apply_chat_template(messages, { add_generation_prompt: true, return_dict: true });
  }
  let count = 0;
  const t0 = performance.now();
  const streamer = new TextStreamer(tokenizer, {
    skip_prompt: true,
    skip_special_tokens: true,
    callback_function: (t) => { count++; post({ type: 'token', reqId, t }); },
  });
  const output = await model.generate({
    ...inputs,
    max_new_tokens: maxTokens,
    do_sample: temperature > 0,
    temperature: temperature > 0 ? temperature : undefined,
    top_p: 0.9,
    repetition_penalty: 1.08,
    streamer,
    stopping_criteria: stopper,
  });
  const len = inputs.input_ids.dims.at(-1);
  const text = tokenizer.batch_decode(output.slice(null, [len, null]), { skip_special_tokens: true })[0];
  const secs = (performance.now() - t0) / 1000;
  busy = false;
  post({ type: 'done', reqId, text, tokens: count, secs });
}

self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (m.type === 'load') await load(m);
    else if (m.type === 'generate') await generate(m);
    else if (m.type === 'stop') { if (stopper) stopper.interrupt(); }
    else if (m.type === 'unload') { if (cur) { try { await cur.model.dispose(); } catch (err) {} cur = null; } post({ type: 'unloaded' }); }
  } catch (err) {
    busy = false;
    post({ type: 'error', reqId: m.reqId, id: m.id, message: (err && err.message) || String(err) });
  }
};
post({ type: 'alive', threads: env.backends.onnx.wasm.numThreads, webgpu: !!self.navigator.gpu });
