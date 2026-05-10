const submitBtn = document.getElementById("submitBtn");

function sendMail(event) {
  event.preventDefault();

  const form = event.target;

  console.log("Form submitted successfully!");

  var params = {
    email: document.getElementById("from_name").value,
    message: document.getElementById("comments").value,
    source: document.getElementById("to_name").value
  };

  const serviceID = "service_wkpowbs";
  const templateID = "template_6kos1xw";

  emailjs
    .send(serviceID, templateID, params)
    .then((res) => {
      console.log(res, "success");
      form.reset();
      submitBtn.disabled = true;
      submitBtn.innerText = "Submitted!";
      submitBtn.classList.remove("prettyBtn");
      submitBtn.classList.add("prettyBtnD");
      setTimeout(function () {
        submitBtn.disabled = false;
        submitBtn.innerText = "Submit Feedback";
        submitBtn.classList.add("prettyBtn");
        submitBtn.classList.remove("prettyBtnD");
      }, 2000);
    })
    .catch((err) => {
      alert("Your message didn't send successfully!!!");
      console.log(err);
    });
}