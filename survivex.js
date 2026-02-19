let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");

// États du jeu
const ETAT = { MENU: "menu", JEU: "jeu", GAMEOVER: "gameover" };
let etatJeu = ETAT.MENU;

// Le joueur
let joueur = {
  x: 450 - 15, y: 450 - 15,
  taille: 30, vitesse: 4,
  vie: 100, couleur: "#00ff88"
};

// Le jeu
let ennemis = [], particules = [], projectiles = [];
let tempsSurvie = 0, ennemiesTues = 0, score = 0, meilleurScore = 0;
let vitesseEnnemis = 1.5, flashRouge = 0;
let intervalSpawn, intervalTemps;
let touches = {};

// --- INPUTS ---
document.onkeydown = function(e) {
  touches[e.key] = true;
  if ((e.key === "r" || e.key === "R") && etatJeu === ETAT.GAMEOVER) reinitialiser();
};
document.onkeyup = function(e) { touches[e.key] = false; };

canvas.onclick = function(e) {
  if (etatJeu === ETAT.MENU) {
    etatJeu = ETAT.JEU;
    lancerIntervals();
    return;
  }
  if (etatJeu !== ETAT.JEU) return;
  let rect = canvas.getBoundingClientRect();
  let sx = e.clientX - rect.left;
  let sy = e.clientY - rect.top;
  let dx = sx - (joueur.x + joueur.taille / 2);
  let dy = sy - (joueur.y + joueur.taille / 2);
  let dist = Math.sqrt(dx * dx + dy * dy);
  projectiles.push({
    x: joueur.x + joueur.taille / 2,
    y: joueur.y + joueur.taille / 2,
    vx: (dx / dist) * 8,
    vy: (dy / dist) * 8,
    rayon: 6
  });
};

// --- REINITIALISER ---
function reinitialiser() {
  joueur.vie = 100;
  joueur.x = canvas.width / 2 - 15;joueur.y = canvas.height / 2 - 15;
  ennemis = []; particules = []; projectiles = [];
  etatJeu = ETAT.JEU;
  tempsSurvie = 0; ennemiesTues = 0; score = 0;
  vitesseEnnemis = 1.5; flashRouge = 0;
  lancerIntervals();
}

// --- ENNEMIS ---
function creerEnnemi() {
  let bord = Math.floor(Math.random() * 4);
  let e = { taille: 20, vitesse: vitesseEnnemis };
  if (bord === 0) { e.x = Math.random() * canvas.width; e.y = 0; }
  else if (bord === 1) { e.x = canvas.width; e.y = Math.random() * canvas.height; }
  else if (bord === 2) { e.x = Math.random() * canvas.width; e.y = canvas.height; }
  else { e.x = 0; e.y = Math.random() * canvas.height; }
  ennemis.push(e);
}

function deplacerEnnemis() {
  for (let e of ennemis) {
    let dx = joueur.x - e.x;
    let dy = joueur.y - e.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    e.x += (dx / dist) * e.vitesse;
    e.y += (dy / dist) * e.vitesse;
  }
}

// --- PARTICULES ---
function creerParticules(x, y) {
  for (let i = 0; i < 8; i++) {
    particules.push({
      x, y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      vie: 1,
      couleur: Math.random() > 0.5 ? "#ff0044" : "#ff6b35"
    });
  }
}

function mettreAJourParticules() {
  for (let i = particules.length - 1; i >= 0; i--) {
    let p = particules[i];
    p.x += p.vx; p.y += p.vy; p.vie -= 0.05;
    if (p.vie <= 0) particules.splice(i, 1);
  }
}

function dessinerParticules() {
  for (let p of particules) {
    ctx.globalAlpha = p.vie;
    ctx.fillStyle = p.couleur;
    ctx.fillRect(p.x, p.y, 6, 6);
  }
  ctx.globalAlpha = 1;
}

// --- PROJECTILES ---
function gererProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let p = projectiles[i];
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) {
      projectiles.splice(i, 1); continue;
    }
    for (let j = ennemis.length - 1; j >= 0; j--) {
      let e = ennemis[j];
      if (p.x > e.x && p.x < e.x + e.taille && p.y > e.y && p.y < e.y + e.taille) {
        creerParticules(e.x, e.y);
        ennemis.splice(j, 1);
        projectiles.splice(i, 1);
        ennemiesTues++;
        score = (ennemiesTues * 10) + (tempsSurvie * 5);
        break;
      }
    }
  }
  ctx.fillStyle = "#00d4ff";
  for (let p of projectiles) {
    ctx.shadowBlur = 10; ctx.shadowColor = "#00d4ff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.rayon, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}

// --- COLLISIONS ---
function verifierCollisions() {
  for (let i = ennemis.length - 1; i >= 0; i--) {
    let e = ennemis[i];
    if (joueur.x < e.x + e.taille && joueur.x + joueur.taille > e.x &&
        joueur.y < e.y + e.taille && joueur.y + joueur.taille > e.y) {
      creerParticules(e.x, e.y);
      flashRouge = 10;
      joueur.vie -= 10;
      ennemis.splice(i, 1);
      if (joueur.vie <= 0) {
        joueur.vie = 0;
        etatJeu = ETAT.GAMEOVER;
        if (score > meilleurScore) meilleurScore = score;
        clearInterval(intervalSpawn);
        clearInterval(intervalTemps);
      }
    }
  }
}

// --- JOUEUR ---
function deplacerJoueur() {
  if (touches["z"] || touches["Z"]) joueur.y -= joueur.vitesse;
  if (touches["s"] || touches["S"]) joueur.y += joueur.vitesse;
  if (touches["q"] || touches["Q"]) joueur.x -= joueur.vitesse;
  if (touches["d"] || touches["D"]) joueur.x += joueur.vitesse;
  joueur.x = Math.max(0, Math.min(canvas.width - joueur.taille, joueur.x));
  joueur.y = Math.max(0, Math.min(canvas.height - joueur.taille, joueur.y));
}

// --- HUD ---
function dessinerHUD() {
  ctx.fillStyle = "#333";
  ctx.fillRect(10, 10, 200, 15);
  ctx.fillStyle = joueur.vie > 50 ? "#00ff88" : joueur.vie > 25 ? "#ff6b35" : "#ff0044";
  ctx.fillRect(10, 10, joueur.vie * 2, 15);
  ctx.fillStyle = "#fff";
  ctx.font = "12px Arial";
  ctx.fillText("VIE : " + joueur.vie + "%", 15, 23);
  ctx.fillStyle = "#00ff88";
  ctx.font = "14px Arial";
  ctx.fillText("⏱ " + tempsSurvie + "s", 10, 50);
  ctx.fillText("💀 Tués : " + ennemiesTues, 10, 70);
  ctx.fillText("🏆 Score : " + score, 10, 90);
  ctx.fillStyle = "#ff6b35";
  ctx.fillText("⚡ Niv : " + Math.floor(vitesseEnnemis), canvas.width - 90, 25);
  ctx.fillStyle = "#00d4ff";
  ctx.fillText("🖱 Clic = tir", canvas.width - 110, 50);
}

// --- ECRANS ---
function dessinerMenu() {
  ctx.fillStyle = "#0a0a0a";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Titre
  ctx.textAlign = "center";
  ctx.shadowBlur = 20; ctx.shadowColor = "#00ff88";
  ctx.fillStyle = "#00ff88";
  ctx.font = "bold 70px Arial";
  ctx.fillText("SURVIVEX", canvas.width / 2, 160);
  ctx.shadowBlur = 0;

  ctx.fillStyle = "#ffffff";
  ctx.font = "18px Arial";
  ctx.fillText("Combien de temps tiendras-tu ?", canvas.width / 2, 210);

  ctx.fillStyle = "#6b6b8a";
  ctx.font = "14px Arial";
  ctx.fillText("Se déplacer : Z Q S D", canvas.width / 2, 280);
  ctx.fillText("Tirer : Clic gauche", canvas.width / 2, 305);
  ctx.fillText("Survivre le plus longtemps possible", canvas.width / 2, 330);

  if (meilleurScore > 0) {
    ctx.fillStyle = "#ff6b35";
    ctx.font = "16px Arial";
    ctx.fillText("🏆 Meilleur score : " + meilleurScore, canvas.width / 2, 380);
  }

  // Bouton jouer
  ctx.fillStyle = "#00ff88";
  ctx.shadowBlur = 15; ctx.shadowColor = "#00ff88";
  ctx.fillRect(canvas.width / 2 - 120, 570, 240, 60);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#0a0a0a";
  ctx.font = "bold 22px Arial";
  ctx.fillText("💀 JOUER", canvas.width / 2, 610);
  ctx.textAlign = "left";

  ctx.fillStyle = "#6b6b8a";
  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.fillText("© 2025 GuigzGame", canvas.width / 2, 490);
  ctx.textAlign = "left";
}

function dessinerGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.85)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.shadowBlur = 20; ctx.shadowColor = "#ff0044";
  ctx.fillStyle = "#ff0044";
  ctx.font = "bold 65px Arial";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 80);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff";
  ctx.font = "20px Arial";
  ctx.fillText("⏱ " + tempsSurvie + " secondes", canvas.width / 2, canvas.height / 2 - 20);
  ctx.fillText("💀 Ennemis tués : " + ennemiesTues, canvas.width / 2, canvas.height / 2 + 15);
  ctx.fillText("🏆 Score : " + score, canvas.width / 2, canvas.height / 2 + 50);
  if (score >= meilleurScore) {
    ctx.fillStyle = "#ff6b35";
    ctx.fillText("🔥 Nouveau record !", canvas.width / 2, canvas.height / 2 + 85);
  }
  ctx.fillStyle = "#00ff88";
  ctx.font = "16px Arial";
  ctx.fillText("Appuie sur R pour rejouer", canvas.width / 2, canvas.height / 2 + 130);
  ctx.textAlign = "left";
}

// --- INTERVALS ---
function lancerIntervals() {
  intervalSpawn = setInterval(function() {
    if (etatJeu === ETAT.JEU) creerEnnemi();
  }, 1500);
  intervalTemps = setInterval(function() {
    if (etatJeu === ETAT.JEU) {
      tempsSurvie++;
      score = (ennemiesTues * 10) + (tempsSurvie * 5);
      if (tempsSurvie % 10 === 0) vitesseEnnemis += 0.3;
    }
  }, 1000);
}

// --- BOUCLE PRINCIPALE ---
function dessiner() {
  if (etatJeu === ETAT.MENU) {
    dessinerMenu();
  } else if (etatJeu === ETAT.JEU) {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    deplacerJoueur();
    deplacerEnnemis();
    verifierCollisions();
    mettreAJourParticules();
    gererProjectiles();
    if (flashRouge > 0) {
      ctx.fillStyle = "rgba(255,0,68," + (flashRouge / 30) + ")";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      flashRouge--;
    }
    ctx.fillStyle = "#ff0044";
    for (let e of ennemis) ctx.fillRect(e.x, e.y, e.taille, e.taille);
    ctx.fillStyle = joueur.couleur;
    ctx.fillRect(joueur.x, joueur.y, joueur.taille, joueur.taille);
    dessinerParticules();
    dessinerHUD();
  } else if (etatJeu === ETAT.GAMEOVER) {
    dessinerGameOver();
  }
  requestAnimationFrame(dessiner);
}

dessiner();