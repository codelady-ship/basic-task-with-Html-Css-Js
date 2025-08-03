const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('active');
});

function startChallenge() {
  alert("Let's get started! Choose your first challenge.");
}

function discoverMore() {
  alert("Explore upcoming challenges and boost your productivity!");
}

window.addEventListener("hashchange", showSection);
window.addEventListener("load", showSection);

function showSection() {
  const hash = window.location.hash.substring(1) || "home";
  document.querySelectorAll("section").forEach((sec) => {
    sec.classList.remove("active");
  });
  const activeSection = document.getElementById(hash);
  if (activeSection) {
    activeSection.classList.add("active");
  }
}

document.querySelector('.contact-form').addEventListener('submit', function (e) {
  e.preventDefault();
  alert('Thanks for your message! We will get back to you soon.');
  this.reset();
});
