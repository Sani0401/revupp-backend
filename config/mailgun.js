import FormData from "form-data"; // form-data v4.0.1
import Mailgun from "mailgun.js"; // mailgun.js v11.1.0

async function sendMail(to, subject, text) {
  const mailgun = new Mailgun(FormData);
  const mg = mailgun.client({
    username: "api",
    key: process.env.MAILGUN_API_KEY || "API_KEY",
    // When you have an EU-domain, you must specify the endpoint:
    // url: "https://api.eu.mailgun.net"
  });
  try {
    const data = await mg.messages.create("sandbox7377f2118baa46839d4ac13dfb426a2a.mailgun.org", {
      from: "sanihussain.work@gmail.com",
      to: [to],
      subject: subject,
      text: text,
    });

    console.log(data); // logs response data
  } catch (error) {
    console.log(error); // logs any error
  }
}

export default sendMail;