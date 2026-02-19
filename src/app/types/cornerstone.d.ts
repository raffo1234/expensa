// src/types/cornerstone-dicom-image-loader.d.ts

declare module "@cornerstonejs/dicom-image-loader" {
  import * as cornerstone from "@cornerstonejs/core";

  interface DICOMImageLoaderConfig {
    maxWebWorkers?: number;
    startWebWorkersOnDemand?: boolean;
    webWorkerPath?: string;
    decodeConfig?: {
      usePDFJS?: boolean;
      strict?: boolean;
      [key: string]: unknown;
    };
  }

  export interface CornerstoneDICOMImageLoader {
    external: {
      cornerstone: typeof cornerstone;
      dicomParser: unknown;
    };
    configure: (config: DICOMImageLoaderConfig) => void;
    wadouri: {
      dataSetCacheManager: unknown;
      fileManager: unknown;
      register: (cornerstone: typeof cornerstone) => void;
    };
    wadors: {
      register: (cornerstone: typeof cornerstone) => void;
    };
    // Añade aquí otros métodos específicos si los usas
  }

  const cornerstoneDICOMImageLoader: CornerstoneDICOMImageLoader;
  export default cornerstoneDICOMImageLoader;
}
