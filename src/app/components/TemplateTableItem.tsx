import { bucketName } from "@/constants";
import { supabase } from "@/lib/supabase";
import { Icon } from "@iconify/react/dist/iconify.js";
import Link from "next/link";
import { useState } from "react";
import { mutate } from "swr";

export default function TemplatesTableItem({
  id,
  name,
  userId,
}: {
  id: string;
  name: string;
  userId: string;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteTemplate = async (templateId: string) => {
    const confirmationMessage = confirm(
      "Are you sure you want to delete this item?"
    );
    if (!confirmationMessage) return;

    setIsDeleting(true);
    const templateFolder = `template_user_${userId}/${templateId}`;

    try {
      const { data: folders } = await supabase.storage
        .from(bucketName)
        .list(templateFolder);

      const filesFound: string[] = [];
      if (folders && folders.length > 0) {
        for (const folder of folders) {
          const { data: filesByFolder } = await supabase.storage
            .from(bucketName)
            .list(`${templateFolder}/${folder.name}`);

          if (filesByFolder && filesByFolder.length > 0) {
            filesByFolder.map((fileByFolder) =>
              filesFound.push(
                `${templateFolder}/${folder.name}/${fileByFolder.name}`
              )
            );
          }
        }

        await supabase.storage.from(bucketName).remove(filesFound);
      }

      await supabase.from("template").delete().eq("id", templateId);

      await mutate(`admin_templates_${userId}`);
    } catch (error) {
      console.error("Error deleting user", error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative border-b border-gray-200 last:border-0">
      <Link
        title={name}
        href={`/admin/templates/${id}`}
        className={`${isDeleting ? "pointer-events-none:" : "cursor-pointer"} px-6 hover:bg-gray-50 first:rounded-t-xl transition-colors duration-300 py-4 gap-3.5 flex items-center`}
      >
        <Icon icon="solar:file-favourite-line-duotone" fontSize={20} />
        <span>{name}</span>
      </Link>
      <button
        disabled={isDeleting}
        onClick={() => deleteTemplate(id)}
        type="button"
        title={`Delete ${name}`}
        className={`${isDeleting ? "cursor-no-drop" : "cursor-pointer"} absolute top-1/2 -translate-y-1/2 right-4 hover:bg-gray-50 w-11 h-11 rounded-full border-gray-100 border text-red-500 flex items-center justify-center`}
      >
        {isDeleting ? (
          <Icon
            icon="solar:record-broken"
            className="animate-spin"
            fontSize={24}
          />
        ) : (
          <Icon icon="solar:trash-bin-minimalistic-broken" fontSize={24} />
        )}
      </button>
    </div>
  );
}
