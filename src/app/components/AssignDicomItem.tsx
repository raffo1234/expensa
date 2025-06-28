import { supabase } from "@/lib/supabase";
import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";
import { mutate as globalMutate } from "swr";
import { UserWithDicomAssignments } from "./AssignDicomTo";

async function revalidateDicomAssignments(dicomIds: string[]) {
  await Promise.all(
    dicomIds.map((dicomId) => globalMutate(`dicom-has-assignments-${dicomId}`))
  );
}

async function unassignDicomFromUser(dicomIds: string[], userId: string) {
  if (dicomIds.length === 0) return;

  const { error } = await supabase
    .from("dicom_user")
    .delete()
    .in("dicom_id", dicomIds)
    .eq("user_id", userId);

  if (error) {
    console.error("Failed to unassign DICOMs from user:", error);
    toast.error("Failed to unassign DICOMs from user");
    throw error;
  }

  toast.success(
    dicomIds.length === 1
      ? "DICOM unassigned successfully"
      : `${dicomIds.length} DICOMs unassigned successfully`
  );
}

async function assignDicomsToUser(
  dicomIds: string[],
  userId: string,
  currentUserId: string
) {
  const now = new Date().toISOString();

  const rows = dicomIds.map((dicomId) => ({
    dicom_id: dicomId,
    user_id: userId,
    assigned_by: currentUserId,
    assigned_at: now,
  }));

  const { error } = await supabase.from("dicom_user").insert(rows);

  if (error) {
    console.error("Assignment failed", error);
    toast.error("Assignment failed");
    throw error;
  }
  toast.success("Assigned successfully");
}

export default function AssignDicomItem({
  userId,
  dicomIds,
  user,
  mutate,
}: {
  userId: string;
  dicomIds: string[];
  user: UserWithDicomAssignments;
  mutate: () => void;
}) {
  const [isAssigning, setIsAssigning] = useState(false);
  const {
    user_id,
    first_name,
    is_assigned,
    assigned_dicom_ids,
    last_name,
    image_url,
    role_name,
  } = user;

  const handleAssign = async () => {
    if (isAssigning) return;

    try {
      setIsAssigning(true);
      await assignDicomsToUser(dicomIds, user_id, userId);
      await revalidateDicomAssignments(dicomIds);
      mutate();
    } catch (err) {
      console.error("Assign failed", err);
    } finally {
      setIsAssigning(false);
    }
  };

  const isAssignedToDicom = (dicomIds: string[]) =>
    dicomIds.some(
      (id) => assigned_dicom_ids && assigned_dicom_ids.includes(id)
    );

  return (
    <button
      disabled={isAssigning}
      onClick={async () => {
        setIsAssigning(true);
        if (isAssignedToDicom(dicomIds)) {
          await unassignDicomFromUser(dicomIds, user_id);
          await revalidateDicomAssignments(dicomIds);
          mutate();
        } else {
          await handleAssign();
        }
        setIsAssigning(false);
        globalMutate((key) => Array.isArray(key) && key[0] === "dicom");
      }}
      className={`${
        isAssignedToDicom(dicomIds)
          ? "disabled:pointer-events-none bg-cyan-50 hover:bg-cyan-100 border-cyan-200"
          : "bg-white hover:bg-gray-50 border-gray-200"
      } cursor-pointer border rounded-2xl p-4 transition-colors duration-300 relative`}
    >
      <div className="absolute top-2 right-2 text-cyan-400">
        {isAssigning ? (
          <svg
            className={`${isAssigning ? "opacity-100" : "0"} animate-spin transition-all duration-300`}
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
          >
            <path
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeWidth="1.5"
              d="M7 3.338A9.95 9.95 0 0 1 12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12c0-1.821.487-3.53 1.338-5"
            />
          </svg>
        ) : null}
      </div>
      <div className="absolute top-2 right-2 text-cyan-400">
        {isAssignedToDicom(dicomIds) ? (
          <svg
            className={`${isAssigning ? "opacity-0" : "100"} transition-all duration-300`}
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M10.594 2.319a3.26 3.26 0 0 1 2.812 0c.387.185.74.487 1.231.905l.078.066c.238.203.313.265.389.316c.193.13.41.219.637.264c.09.018.187.027.499.051l.101.008c.642.051 1.106.088 1.51.23a3.27 3.27 0 0 1 1.99 1.99c.142.404.178.868.23 1.51l.008.101c.024.312.033.41.051.499c.045.228.135.445.264.638c.051.075.113.15.316.388l.066.078c.419.49.72.844.905 1.23c.425.89.425 1.924 0 2.813c-.184.387-.486.74-.905 1.231l-.066.078a5 5 0 0 0-.316.389c-.13.193-.219.41-.264.637c-.018.09-.026.187-.051.499l-.009.101c-.05.642-.087 1.106-.23 1.51a3.26 3.26 0 0 1-1.989 1.99c-.404.142-.868.178-1.51.23l-.101.008a5 5 0 0 0-.499.051a1.8 1.8 0 0 0-.637.264a5 5 0 0 0-.39.316l-.077.066c-.49.419-.844.72-1.23.905a3.26 3.26 0 0 1-2.813 0c-.387-.184-.74-.486-1.231-.905l-.078-.066a5 5 0 0 0-.388-.316a1.8 1.8 0 0 0-.638-.264a5 5 0 0 0-.499-.051l-.101-.009c-.642-.05-1.106-.087-1.51-.23a3.26 3.26 0 0 1-1.99-1.989c-.142-.404-.179-.868-.23-1.51l-.008-.101a5 5 0 0 0-.051-.499a1.8 1.8 0 0 0-.264-.637a5 5 0 0 0-.316-.39l-.066-.077c-.418-.49-.72-.844-.905-1.23a3.26 3.26 0 0 1 0-2.813c.185-.387.487-.74.905-1.231l.066-.078a5 5 0 0 0 .316-.388c.13-.193.219-.41.264-.638c.018-.09.027-.187.051-.499l.008-.101c.051-.642.088-1.106.23-1.51a3.26 3.26 0 0 1 1.99-1.99c.404-.142.868-.179 1.51-.23l.101-.008a5 5 0 0 0 .499-.051c.228-.045.445-.135.638-.264c.075-.051.15-.113.388-.316l.078-.066c.49-.418.844-.72 1.23-.905m2.163 1.358a1.76 1.76 0 0 0-1.514 0c-.185.088-.38.247-.981.758l-.03.025c-.197.168-.34.291-.497.396c-.359.24-.761.407-1.185.49c-.185.037-.373.052-.632.073l-.038.003c-.787.063-1.036.089-1.23.157c-.5.177-.894.57-1.07 1.071c-.07.194-.095.443-.158 1.23l-.003.038c-.02.259-.036.447-.072.632c-.084.424-.25.826-.49 1.185c-.106.157-.229.3-.397.498l-.025.029c-.511.6-.67.796-.758.98a1.76 1.76 0 0 0 0 1.515c.088.185.247.38.758.981l.025.03c.168.197.291.34.396.497c.24.359.407.761.49 1.185c.037.185.052.373.073.632l.003.038c.063.787.089 1.036.157 1.23c.177.5.57.894 1.071 1.07c.194.07.443.095 1.23.158l.038.003c.259.02.447.036.632.072c.424.084.826.25 1.185.49c.157.106.3.229.498.397l.029.025c.6.511.796.67.98.758a1.76 1.76 0 0 0 1.515 0c.185-.088.38-.247.981-.758l.03-.025c.197-.168.34-.291.497-.396c.359-.24.761-.407 1.185-.49a6 6 0 0 1 .632-.073l.038-.003c.787-.063 1.036-.089 1.23-.157c.5-.177.894-.57 1.07-1.071c.07-.194.095-.444.158-1.23l.003-.038a6 6 0 0 1 .072-.633c.084-.423.25-.825.49-1.184c.106-.157.229-.3.397-.498l.025-.029c.511-.6.67-.796.758-.98a1.76 1.76 0 0 0 0-1.515c-.088-.185-.247-.38-.758-.981l-.025-.03c-.168-.197-.291-.34-.396-.497a3.3 3.3 0 0 1-.49-1.185a6 6 0 0 1-.073-.632l-.003-.038c-.063-.787-.089-1.036-.157-1.23c-.177-.5-.57-.894-1.071-1.07c-.194-.07-.444-.095-1.23-.158l-.038-.003a6 6 0 0 1-.633-.072a3.3 3.3 0 0 1-1.184-.49c-.157-.106-.3-.229-.498-.397l-.029-.025c-.6-.511-.796-.67-.98-.758m3.287 5.282a.75.75 0 0 1 0 1.065l-5.017 5.017a.753.753 0 0 1-1.064 0l-2.007-2.007A.753.753 0 1 1 9.02 11.97l1.475 1.474L14.98 8.96a.753.753 0 0 1 1.064 0"
              clipRule="evenodd"
            />
          </svg>
        ) : null}
      </div>
      {image_url ? (
        <Image
          src={image_url}
          className="rounded-full mb-3 mx-auto bg-gray-100"
          alt={first_name || user_id}
          width={44}
          height={44}
          title={first_name}
        />
      ) : (
        <div className="w-11 h-11 rounded-full mb-3 mx-auto bg-gray-200"></div>
      )}
      <div
        className="font-semibold w-full mb-1 text-center truncate"
        title={first_name}
      >
        {first_name} {last_name}
      </div>
      {is_assigned ? (
        <div className="text-sm text-gray-500 w-full text-center mb-4">
          Assigned to {assigned_dicom_ids.length} stud
          {assigned_dicom_ids.length === 1 ? "y" : "ies"}
        </div>
      ) : null}
      <div className="text-sm text-gray-500 w-full text-center">
        {role_name}
      </div>
    </button>
  );
}
