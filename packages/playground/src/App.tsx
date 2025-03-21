import { useState, useEffect, useCallback } from "react";
import "./App.css";

import EditorModal, { EditorFiles } from "./EditorModal";
import sampleAppFiles from "./sample_app";

import {
  StliteKernel,
  StliteKernelOptions,
  StliteKernelProvider,
} from "@stlite/kernel";

import { Id as ToastId, Slide, toast } from "react-toastify";

import ThemedApp from "streamlit-browser/src/ThemedApp";
import { Client as Styletron } from "styletron-engine-atomic";
import { Provider as StyletronProvider } from "styletron-react";
const engine = new Styletron({ prefix: "st-" });

const REQUIREMENTS_PATH = "requirements";

const DEFAULT_REQUIREMENTS = ["matplotlib", "hiplot"];

const SAMPLE_APP_EDITOR_FILES: EditorFiles = {};
Object.keys(sampleAppFiles).forEach((key) => {
  SAMPLE_APP_EDITOR_FILES[key] = {
    value: sampleAppFiles[key],
    language: "python",
  };
});

const DEFAULT_EDITOR_FILES: EditorFiles = {
  ...SAMPLE_APP_EDITOR_FILES,
  [REQUIREMENTS_PATH]: {
    language: "text",
    value: DEFAULT_REQUIREMENTS.join("\n"),
  },
};

const DEFAULT_KERNEL_FILES: StliteKernelOptions["files"] = {};
Object.keys(sampleAppFiles).forEach((key) => {
  DEFAULT_KERNEL_FILES[key] = {
    data: sampleAppFiles[key],
  };
});

function App() {
  const [kernel, setKernel] = useState<StliteKernel>();
  useEffect(() => {
    let prevToastId: ToastId | null = null;
    const toastIds: ToastId[] = [];
    const kernel = new StliteKernel({
      command: "run",
      entrypoint: "Hello.py",
      requirements: DEFAULT_REQUIREMENTS,
      files: DEFAULT_KERNEL_FILES,
      basePath: __webpack_public_path__,
      onProgress: (message) => {
        const id = toast(message, {
          position: toast.POSITION.BOTTOM_RIGHT,
          transition: Slide,
          isLoading: true,
          hideProgressBar: true,
          closeButton: false,
        });
        toastIds.push(id);

        if (prevToastId) {
          toast.update(prevToastId, {
            isLoading: false,
            autoClose: 3000,
          });
        }
        prevToastId = id;
      },
      onLoad: () => {
        toastIds.forEach((id) => toast.dismiss(id));
      },
    });
    setKernel(kernel);

    return () => {
      kernel.dispose();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <EditorModal
        defaultFiles={DEFAULT_EDITOR_FILES}
        onFileChange={useCallback(
          (path: string, value: string) => {
            if (kernel == null) {
              return;
            }

            if (path === REQUIREMENTS_PATH) {
              const requirements = value
                .split("\n")
                .map((r) => r.trim())
                .filter((r) => r !== "");

              toast.promise(
                kernel.install(requirements),
                {
                  pending: "Installing",
                  success: "Successfully installed",
                  error: "Failed to install",
                },
                {
                  hideProgressBar: true,
                  position: toast.POSITION.BOTTOM_RIGHT,
                }
              );
              return;
            }

            kernel.writeFile(path, value);
          },
          [kernel]
        )}
      />
      {kernel && (
        <StliteKernelProvider kernel={kernel}>
          <StyletronProvider value={engine}>
            <ThemedApp />
          </StyletronProvider>
        </StliteKernelProvider>
      )}
    </>
  );
}

export default App;
