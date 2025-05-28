import JSZip from "jszip";
import { BlobProvider } from "@react-pdf/renderer";
import { saveAs } from "file-saver";
import { createRoot } from "react-dom/client"; // Import createRoot
import ContentPDFDocument from "@/components/ContentPDFDocument";
import { DicomType } from "@/types/dicomType";

const GeneratePdfButton = ({ dicom }: { dicom: DicomType }) => {
  const generatePdf = async () => {
    try {
      const pdfBlobs = await Promise.all(
        [2, 3, 4].map(async () => await generatePdfUrl())
      );
      await createAndDownloadZip(pdfBlobs);
    } catch (error) {
      console.error("Error generating PDFs:", error);
    }
  };

  const generatePdfUrl = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const container = document.createElement("div");
      const root = createRoot(container);

      const pdfElement = (
        <BlobProvider
          document={
            <ContentPDFDocument
              dicom={dicom}
              activeTemplate={dicom.template}
              content={dicom.report}
            />
          }
        >
          {({ blob, loading, error }) => {
            if (!loading && !error && blob) {
              resolve(blob);

              setTimeout(() => {
                root.unmount();
              });
            } else if (error) {
              reject(error);

              setTimeout(() => {
                root.unmount();
              });
            }
            return null;
          }}
        </BlobProvider>
      );
      root.render(pdfElement);
    });
  };

  async function createAndDownloadZip(pdfBlobs: Blob[]) {
    const zip = new JSZip();
    const agent_name = "Abhay Kumar"; // This can be dynamic for different PDFs
    pdfBlobs.forEach((blob, index) => {
      zip.file(`${agent_name}_${index}.pdf`, blob);
    });

    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, `${agent_name}_pdfs.zip`);
    });
  }

  return <button onClick={generatePdf}>Generate and Download PDFs</button>;
};

export default GeneratePdfButton;
