export const sendEmailToAdmin = async ({ idDicom }: { idDicom: string }) => {
  try {
    const response = await fetch("/api/send-email-admin", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: "ivan.meza1@unmsm.edu.pe",
        link: `https://cadia.cc/admin/dicoms/${idDicom}`,
      }),
    });

    if (response.ok) {
      console.info("Email sent successfully!");
    } else {
      const errorData = await response.json();
      console.error(errorData.error || "Failed to send email.");
    }
  } catch (error) {
    console.error("Error sending email:", error);
  }
};
