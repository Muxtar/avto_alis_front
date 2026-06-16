// face-api.js (vladmandic fork) ilə brauzerdə üz uyğunluğu.
// Modellər CDN-dən yüklənir (repo-da saxlanmır). Yalnız client-də işləyir.

const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.15/model";
let modelsLoaded = false;
let faceapiMod: any = null;

async function getFaceApi() {
  if (!faceapiMod) faceapiMod = await import("@vladmandic/face-api");
  if (!modelsLoaded) {
    await faceapiMod.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
    await faceapiMod.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
    await faceapiMod.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
    modelsLoaded = true;
  }
  return faceapiMod;
}

export type FaceResult =
  | { ok: true; distance: number; score: number; matched: boolean }
  | { ok: false; reason: "id_no_face" | "selfie_no_face" | "load_error" };

type ImgInput = HTMLImageElement | HTMLCanvasElement;

// İki şəkildə üzləri müqayisə et. score: 0–1 (1 = eyni), matched: distance < 0.5.
export async function compareFaces(idImg: ImgInput, selfieImg: ImgInput): Promise<FaceResult> {
  let faceapi: any;
  try {
    faceapi = await getFaceApi();
  } catch {
    return { ok: false, reason: "load_error" };
  }
  try {
    const idDet = await faceapi.detectSingleFace(idImg).withFaceLandmarks().withFaceDescriptor();
    if (!idDet) return { ok: false, reason: "id_no_face" };
    const selfieDet = await faceapi.detectSingleFace(selfieImg).withFaceLandmarks().withFaceDescriptor();
    if (!selfieDet) return { ok: false, reason: "selfie_no_face" };
    const distance: number = faceapi.euclideanDistance(idDet.descriptor, selfieDet.descriptor);
    const score = Math.max(0, Math.min(1, 1 - distance)); // sadə oxşarlıq 0–1
    return { ok: true, distance, score, matched: distance < 0.5 };
  } catch {
    return { ok: false, reason: "load_error" };
  }
}
