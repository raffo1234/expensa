export const sendEmailToUser = async ({userEmail}: {userEmail: string}) => {
    try {
      const response = await fetch("/api/send-email-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: userEmail,
          link: `https://cadia.pe`,
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