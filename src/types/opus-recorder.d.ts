declare module "opus-recorder" {
  interface OpusRecorderInstance {
    start(): Promise<void>;
    stop(): Promise<void>;
    close(): Promise<void> | void;
    ondataavailable: (data: Uint8Array) => void;
    onstop: () => void;
  }

  interface OpusRecorderCtor {
    new (config: Record<string, unknown>): OpusRecorderInstance;
    isRecordingSupported(): boolean;
  }

  const Recorder: OpusRecorderCtor;
  export default Recorder;
}
