import { heightToNormalPixels } from './normal-map';

interface NormalRequest {
  id: number;
  width: number;
  height: number;
  strength: number;
  data: Uint8ClampedArray;
}

interface NormalResponse {
  id: number;
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

const worker = self as unknown as {
  onmessage: ((event: MessageEvent<NormalRequest>) => void) | null;
  postMessage(message: NormalResponse, transfer: Transferable[]): void;
};

worker.onmessage = (event) => {
  const { id, width, height, strength, data } = event.data;
  const out = heightToNormalPixels(data, width, height, strength);
  const response: NormalResponse = { id, width, height, data: out };
  worker.postMessage(response, [out.buffer]);
};
