(function(){
  var cfg = window.PORTEFOLIO_CONFIG || {};
  var api = String(cfg.apiBaseUrl || "").replace(/\/$/, "");
  var headers = { "Content-Type": "application/json" };
  if (cfg.projectId) headers["x-project-id"] = String(cfg.projectId);
  if (cfg.token) headers["Authorization"] = "Bearer " + cfg.token;
  fetch(api + "/portfolio/v1/public/all", { headers: headers })
    .then(function(r){ return r.json(); })
    .then(function(json){
      var root = document.getElementById("root");
      var data = (json && json.data) ? json.data : {};
      var projects = Array.isArray(data.projects) ? data.projects : [];
      var skills = Array.isArray(data.skills) ? data.skills : [];
      var experiences = Array.isArray(data.experiences) ? data.experiences : [];
      var testimonials = Array.isArray(data.testimonials) ? data.testimonials : [];
      function el(tag, attrs, children){
        var e = document.createElement(tag);
        if (attrs) { for (var k in attrs) { e.setAttribute(k, attrs[k]); } }
        if (children){
          if (Array.isArray(children)){
            for (var i=0;i<children.length;i++){
              var c = children[i];
              e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
            }
          } else {
            e.appendChild(typeof children === "string" ? document.createTextNode(children) : children);
          }
        }
        return e;
      }
      var container = el("div", { class: "container" }, []);
      container.appendChild(el("h1", null, "Portfolio"));
      var sectionProjects = el("section", { class: "section" }, [
        el("h2", null, "Projects"),
        el("ul", null, projects.map(function(p){ return el("li", null, String(p.title || "Untitled")); }))
      ]);
      var sectionSkills = el("section", { class: "section" }, [
        el("h2", null, "Skills"),
        el("ul", null, skills.map(function(s){ return el("li", null, String(s.name || "")); }))
      ]);
      var sectionExperiences = el("section", { class: "section" }, [
        el("h2", null, "Experiences"),
        el("ul", null, experiences.map(function(x){ return el("li", null, String(x.title || "") + " — " + String(x.company || "")); }))
      ]);
      var sectionTestimonials = el("section", { class: "section" }, [
        el("h2", null, "Testimonials"),
        el("ul", null, testimonials.map(function(t){ return el("li", null, String(t.authorName || "") + " — " + String(t.content || "")); }))
      ]);
      container.appendChild(sectionProjects);
      container.appendChild(sectionSkills);
      container.appendChild(sectionExperiences);
      container.appendChild(sectionTestimonials);
      root.innerHTML = "";
      root.appendChild(container);
    })
    .catch(function(){
      var root = document.getElementById("root");
      root.textContent = "Failed to load portfolio";
    });
})();
