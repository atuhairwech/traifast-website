document.addEventListener("DOMContentLoaded",()=>{const m=document.querySelector(".menu-btn"),l=document.querySelector(".nav-links");if(m&&l)m.addEventListener("click",()=>{l.classList.toggle("open");m.setAttribute("aria-expanded",l.classList.contains("open"))});document.querySelectorAll("[data-year]").forEach(e=>e.textContent=new Date().getFullYear());document.querySelectorAll("form[data-quote]").forEach(f=>f.addEventListener("submit",e=>{e.preventDefault();const d=new FormData(f),body=`Name: ${d.get("name")||""}
Company: ${d.get("company")||""}
Email: ${d.get("email")||""}
Phone: ${d.get("phone")||""}

Requirement:
${d.get("requirement")||""}`;location.href=`mailto:info@traifast.com?subject=${encodeURIComponent("Traifast Enquiry — "+(d.get("company")||"New Customer"))}&body=${encodeURIComponent(body)}`}));});