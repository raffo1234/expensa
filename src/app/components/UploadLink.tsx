import PrimaryButton from "./PrimaryButton";

export default function UploadLink({ label = "Upload Studies" }: { label?: string }) {
  return <PrimaryButton href="/admin/dicom" label={label} icon="solar:cloud-upload-broken" />;
}
