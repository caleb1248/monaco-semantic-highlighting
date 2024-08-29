import type { IDisposable } from "monaco-editor-core";

class DisposableList implements IDisposable {
  private disposables: IDisposable[] = [];

  push(disposable: IDisposable | undefined) {
    if (disposable) this.disposables.push(disposable);
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose());
    this.disposables.length = 0;
  }
}

export { DisposableList, DisposableList as default };
