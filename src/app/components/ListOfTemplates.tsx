import { DicomType } from "@/types/dicomType";
import { TemplateType } from "@/types/templateType";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";

function putFirst(array: TemplateType[], element: TemplateType | undefined) {
  if (element)
    return [element, ...array.filter((item) => item.id !== element.id)];
  return array;
}

export default function ListOfTemplates({
  templates,
  updateTemplate,
  activeTemplate,
  dicom,
}: {
  templates: TemplateType[];
  updateTemplate: (newTemplate: TemplateType) => void;
  activeTemplate: TemplateType;
  dicom: DicomType;
}) {
  const handleTemplateActive = (dicomId: string, newTemplate: TemplateType) => {
    updateTemplate(newTemplate);
    localStorage.setItem("dicomActiveTemplateId", newTemplate.id);
  };
  const sortedTemplates = putFirst(templates, activeTemplate);

  if (!dicom) return null;

  return (
    <div
      className="grid gap-2 mb-4 sm:mb-0 flex-grow-1"
      style={{
        gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
      }}
    >
      {sortedTemplates.map((template) => {
        const { id, name } = template;
        return (
          <button
            key={id}
            type="button"
            title={name}
            onClick={() => handleTemplateActive(dicom.id, template)}
            className={`
                          ${
                            id === dicom.template_id
                              ? "bg-rose-50 border-rose-200"
                              : "bg-gray-50 border-gray-200"
                          } 
                        cursor-pointer truncate text-center p-3 rounded-xl border`}
          >
            {name}
          </button>
        );
      })}
      <Link
        href="/admin/templates"
        className="flex items-center cursor-pointer text-center p-1 transition-colors duration-300 text-gray-500 hover:text-cyan-400 group"
        title="Add template"
      >
        <Icon icon="solar:add-circle-linear" fontSize={32} />
      </Link>
    </div>
  );
}
