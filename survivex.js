let canvas = document.getElementById("canvas");
let ctx = canvas.getContext("2d");
let powerups = [];
let tirRapide = false;
let bouclier = false;
let intervalPowerup;

const ETAT = { MENU: "menu", JEU: "jeu", GAMEOVER: "gameover" };
let etatJeu = ETAT.MENU;

let joueur = {
  x: 450 - 15, y: 450 - 15,
  taille: 30, vitesse: 4,
  vie: 100, couleur: "#00ff88"
};

let ennemis = [], particules = [], projectiles = [];
let tempsSurvie = 0, ennemiesTues = 0, score = 0, meilleurScore = 0;
let vitesseEnnemis = 1.5, flashRouge = 0;
let intervalSpawn, intervalTemps;
let touches = {};

document.onkeydown = function(e) {
  touches[e.key] = true;
  if ((e.key === "r" || e.key === "R") && etatJeu === ETAT.GAMEOVER) reinitialiser();
};
document.onkeyup = function(e) { touches[e.key] = false; };

canvas.onclick = function(e) {
  if (etatJeu === ETAT.MENU) { etatJeu = ETAT.JEU; lancerIntervals(); return; }
  if (etatJeu !== ETAT.JEU) return;
  let rect = canvas.getBoundingClientRect();
  let sx = e.clientX - rect.left;
  let sy = e.clientY - rect.top;
  let dx = sx - (joueur.x + joueur.taille / 2);
  let dy = sy - (joueur.y + joueur.taille / 2);
  let dist = Math.sqrt(dx * dx + dy * dy);
  let nbProjectiles = tirRapide ? 3 : 1;
  for (let i = 0; i < nbProjectiles; i++) {
    let angle = (i - 1) * 0.2;
    projectiles.push({
      x: joueur.x + joueur.taille / 2,
      y: joueur.y + joueur.taille / 2,
      vx: (dx / dist) * 8 * Math.cos(angle) - (dy / dist) * 8 * Math.sin(angle),
      vy: (dx / dist) * 8 * Math.sin(angle) + (dy / dist) * 8 * Math.cos(angle),
      rayon: 6
    });
  }
};

function reinitialiser() {
  joueur.vie = 100;
  joueur.x = canvas.width / 2 - 15;
  joueur.y = canvas.height / 2 - 15;
  joueur.couleur = "#00ff88";
  ennemis = []; particules = []; projectiles = []; powerups = [];
  etatJeu = ETAT.JEU;
  tempsSurvie = 0; ennemiesTues = 0; score = 0;
  vitesseEnnemis = 1.5; flashRouge = 0;
  tirRapide = false; bouclier = false;
  clearInterval(intervalPowerup);
  lancerIntervals();
}

function creerEnnemi() {
  let bord = Math.floor(Math.random() * 4);
  let type = Math.floor(Math.random() * 3);
  let types = [
    { nom: "zombie", taille: 25, vitesse: vitesseEnnemis * 0.6, vie: 2, vieMax: 2, couleur: "#ff0044", degats: 10 },
    { nom: "chasseur", taille: 15, vitesse: vitesseEnnemis * 1.8, vie: 1, vieMax: 1, couleur: "#ff6b35", degats: 15 },
    { nom: "titan", taille: 45, vitesse: vitesseEnnemis * 0.3, vie: 4, vieMax: 4, couleur: "#9d4edd", degats: 25 }
  ];
  let e = { ...types[type] };
  if (bord === 0) { e.x = Math.random() * canvas.width; e.y = 0; }
  else if (bord === 1) { e.x = canvas.width; e.y = Math.random() * canvas.height; }
  else if (bord === 2) { e.x = Math.random() * canvas.width; e.y = canvas.height; }
  else { e.x = 0; e.y = Math.random() * canvas.height; }
  ennemis.push(e);
}

function creerPowerup() {
  let types = [
    { type: "soin", couleur: "#00ff88", symbole: "❤️", taille: 20 },
    { type: "tirRapide", couleur: "#00d4ff", symbole: "⚡", taille: 20 },
    { type: "bouclier", couleur: "#ffd700", symbole: "🛡", taille: 20 }
  ];
  let t = types[Math.floor(Math.random() * 3)];
  powerups.push({ ...t, x: 50 + Math.random() * (canvas.width - 100), y: 50 + Math.random() * (canvas.height - 100), vie: 1 });
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

function gererPowerups() {
  for (let i = powerups.length - 1; i >= 0; i--) {
    let p = powerups[i];
    p.vie -= 0.003;
    if (p.vie <= 0) { powerups.splice(i, 1); continue; }
    if (joueur.x < p.x + p.taille && joueur.x + joueur.taille > p.x &&
        joueur.y < p.y + p.taille && joueur.y + joueur.taille > p.y) {
      if (p.type === "soin") {
        joueur.vie = Math.min(100, joueur.vie + 30);
      } else if (p.type === "tirRapide") {
        tirRapide = true;
        setTimeout(function() { tirRapide = false; }, 5000);
      } else if (p.type === "bouclier") {
        bouclier = true;
        joueur.couleur = "#ffd700";
        setTimeout(function() { bouclier = false; joueur.couleur = "#00ff88"; }, 3000);
      }
      powerups.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = p.vie;
    ctx.fillStyle = p.couleur;
    ctx.shadowBlur = 15; ctx.shadowColor = p.couleur;
    ctx.fillRect(p.x, p.y, p.taille, p.taille);
    ctx.shadowBlur = 0;
    ctx.font = "14px Arial";
    ctx.fillText(p.symbole, p.x + 2, p.y + 15);
    ctx.globalAlpha = 1;
  }
}

function creerParticules(x, y) {
  for (let i = 0; i < 8; i++) {
    particules.push({ x, y, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5, vie: 1, couleur: Math.random() > 0.5 ? "#ff0044" : "#ff6b35" });
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

function gererProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    let p = projectiles[i];
    p.x += p.vx; p.y += p.vy;
    if (p.x < 0 || p.x > canvas.width || p.y < 0 || p.y > canvas.height) { projectiles.splice(i, 1); continue; }
    for (let j = ennemis.length - 1; j >= 0; j--) {
      let e = ennemis[j];
      if (p.x > e.x && p.x < e.x + e.taille && p.y > e.y && p.y < e.y + e.taille) {
        creerParticules(e.x, e.y);
        e.vie--;
        projectiles.splice(i, 1);
        if (e.vie <= 0) { ennemis.splice(j, 1); ennemiesTues++; score = (ennemiesTues * 10) + (tempsSurvie * 5); }
        break;
      }
    }
  }
  ctx.fillStyle = "#00d4ff";
  for (let p of projectiles) {
    ctx.shadowBlur = 10; ctx.shadowColor = "#00d4ff";
    ctx.beginPath(); ctx.arc(p.x, p.y, p.rayon, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
  }
}

function verifierCollisions() {
  for (let i = ennemis.length - 1; i >= 0; i--) {
    let e = ennemis[i];
    if (joueur.x < e.x + e.taille && joueur.x + joueur.taille > e.x &&
        joueur.y < e.y + e.taille && joueur.y + joueur.taille > e.y) {
      creerParticules(e.x, e.y);
      ennemis.splice(i, 1);
      if (!bouclier) {
        flashRouge = 10;
        joueur.vie -= e.degats;
        if (joueur.vie <= 0) {
          joueur.vie = 0;
          etatJeu = ETAT.GAMEOVER;
          if (score > meilleurScore) meilleurScore = score;
          clearInterval(intervalSpawn); clearInterval(intervalTemps); clearInterval(intervalPowerup);
        }
      }
    }
  }
}

function deplacerJoueur() {
  if (touches["z"] || touches["Z"]) joueur.y -= joueur.vitesse;
  if (touches["s"] || touches["S"]) joueur.y += joueur.vitesse;
  if (touches["q"] || touches["Q"]) joueur.x -= joueur.vitesse;
  if (touches["d"] || touches["D"]) joueur.x += joueur.vitesse;
  joueur.x = Math.max(0, Math.min(canvas.width - joueur.taille, joueur.x));
  joueur.y = Math.max(0, Math.min(canvas.height - joueur.taille, joueur.y));
}

function dessinerJoueur() {
  let x = joueur.x;
  let y = joueur.y;
  let c = joueur.couleur;

  if (bouclier) {
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20; ctx.shadowColor = "#ffd700";
    ctx.beginPath(); ctx.arc(x + 15, y + 15, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineWidth = 1;
  }

  // Corps
  ctx.fillStyle = c;
  ctx.fillRect(x + 8, y + 14, 14, 12);

  // Tête
  ctx.beginPath(); ctx.arc(x + 15, y + 10, 8, 0, Math.PI * 2); ctx.fill();

  // Yeux
  ctx.fillStyle = "#0a0a0a";
  ctx.beginPath(); ctx.arc(x + 12, y + 9, 2, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x + 18, y + 9, 2, 0, Math.PI * 2); ctx.fill();

  // Jambes
  ctx.fillStyle = c;
  ctx.fillRect(x + 8, y + 26, 5, 6);
  ctx.fillRect(x + 17, y + 26, 5, 6);

  // Bras
  ctx.fillRect(x + 2, y + 14, 5, 3);
  ctx.fillRect(x + 23, y + 14, 5, 3);

  // Arme
  ctx.fillStyle = "#aaaaaa";
  ctx.fillRect(x + 25, y + 13, 8, 3);
}

function dessinerHUD() {
  ctx.fillStyle = "#333";
  ctx.fillRect(10, 10, 200, 15);
  ctx.fillStyle = joueur.vie > 50 ? "#00ff88" : joueur.vie > 25 ? "#ff6b35" : "#ff0044";
  ctx.fillRect(10, 10, joueur.vie * 2, 15);
  ctx.fillStyle = "#fff"; ctx.font = "12px Arial";
  ctx.fillText("VIE : " + joueur.vie + "%", 15, 23);
  ctx.fillStyle = "#00ff88"; ctx.font = "14px Arial";
  ctx.fillText("⏱ " + tempsSurvie + "s", 10, 50);
  ctx.fillText("💀 Tués : " + ennemiesTues, 10, 70);
  ctx.fillText("🏆 Score : " + score, 10, 90);
  ctx.fillStyle = "#ff6b35";
  ctx.fillText("⚡ Niv : " + Math.floor(vitesseEnnemis), canvas.width - 90, 25);
  ctx.fillStyle = "#00d4ff";
  ctx.fillText("🖱 Clic = tir", canvas.width - 110, 50);
  if (tirRapide) { ctx.fillStyle = "#00d4ff"; ctx.fillText("⚡ TIR RAPIDE !", canvas.width - 130, 75); }
  if (bouclier) { ctx.fillStyle = "#ffd700"; ctx.fillText("🛡 BOUCLIER !", canvas.width - 120, 100); }
  ctx.fillStyle = "#ff0044"; ctx.fillRect(10, canvas.height - 80, 15, 15);
  ctx.fillStyle = "#fff"; ctx.font = "12px Arial";
  ctx.fillText("Zombie (2 coups)", 30, canvas.height - 68);
  ctx.fillStyle = "#ff6b35"; ctx.fillRect(10, canvas.height - 55, 10, 10);
  ctx.fillStyle = "#fff"; ctx.fillText("Chasseur (rapide)", 30, canvas.height - 45);
  ctx.fillStyle = "#9d4edd"; ctx.fillRect(10, canvas.height - 30, 20, 20);
  ctx.fillStyle = "#fff"; ctx.fillText("Titan (4 coups)", 35, canvas.height - 15);
}

function dessinerMenu() {
  ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.shadowBlur = 20; ctx.shadowColor = "#00ff88";
  ctx.fillStyle = "#00ff88"; ctx.font = "bold 80px Arial";
  ctx.fillText("SURVIVEX", canvas.width / 2, 250);
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#ffffff"; ctx.font = "20px Arial";
  ctx.fillText("Combien de temps tiendras-tu ?", canvas.width / 2, 310);
  ctx.fillStyle = "#6b6b8a"; ctx.font = "16px Arial";
  ctx.fillText("Se déplacer : Z Q S D", canvas.width / 2, 400);
  ctx.fillText("Tirer : Clic gauche", canvas.width / 2, 430);
  ctx.fillText("Survivre le plus longtemps possible", canvas.width / 2, 460);
  ctx.font = "15px Arial";
  ctx.fillStyle = "#ff0044"; ctx.fillText("🟥 Zombie — lent, 2 coups", canvas.width / 2, 510);
  ctx.fillStyle = "#ff6b35"; ctx.fillText("🟧 Chasseur — rapide, 1 coup", canvas.width / 2, 535);
  ctx.fillStyle = "#9d4edd"; ctx.fillText("🟪 Titan — énorme, 4 coups", canvas.width / 2, 560);
  if (meilleurScore > 0) {
    ctx.fillStyle = "#ff6b35"; ctx.font = "18px Arial";
    ctx.fillText("🏆 Meilleur score : " + meilleurScore, canvas.width / 2, 610);
  }
  ctx.fillStyle = "#00ff88"; ctx.shadowBlur = 15; ctx.shadowColor = "#00ff88";
  ctx.fillRect(canvas.width / 2 - 120, 650, 240, 60);
  ctx.shadowBlur = 0; ctx.fillStyle = "#0a0a0a"; ctx.font = "bold 26px Arial";
  ctx.fillText("💀 JOUER", canvas.width / 2, 690);
  ctx.fillStyle = "#6b6b8a"; ctx.font = "14px Arial";
  ctx.fillText("© 2025 GuigzGame", canvas.width / 2, 870);
  ctx.textAlign = "left";
}

function dessinerGameOver() {
  ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.shadowBlur = 20; ctx.shadowColor = "#ff0044";
  ctx.fillStyle = "#ff0044"; ctx.font = "bold 65px Arial";
  ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 80);
  ctx.shadowBlur = 0; ctx.fillStyle = "#ffffff"; ctx.font = "20px Arial";
  ctx.fillText("⏱ " + tempsSurvie + " secondes", canvas.width / 2, canvas.height / 2 - 20);
  ctx.fillText("💀 Ennemis tués : " + ennemiesTues, canvas.width / 2, canvas.height / 2 + 15);
  ctx.fillText("🏆 Score : " + score, canvas.width / 2, canvas.height / 2 + 50);
  if (score >= meilleurScore) { ctx.fillStyle = "#ff6b35"; ctx.fillText("🔥 Nouveau record !", canvas.width / 2, canvas.height / 2 + 85); }
  ctx.fillStyle = "#00ff88"; ctx.font = "16px Arial";
  ctx.fillText("Appuie sur R pour rejouer", canvas.width / 2, canvas.height / 2 + 130);
  ctx.textAlign = "left";
}

function lancerIntervals() {
  intervalSpawn = setInterval(function() { if (etatJeu === ETAT.JEU) creerEnnemi(); }, 1500);
  intervalTemps = setInterval(function() {
    if (etatJeu === ETAT.JEU) {
      tempsSurvie++;
      score = (ennemiesTues * 10) + (tempsSurvie * 5);
      if (tempsSurvie % 10 === 0) vitesseEnnemis += 0.3;
    }
  }, 1000);
  intervalPowerup = setInterval(function() { if (etatJeu === ETAT.JEU) creerPowerup(); }, 8000);
}

function dessiner() {
  if (etatJeu === ETAT.MENU) {
    dessinerMenu();
  } else if (etatJeu === ETAT.JEU) {
    ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    deplacerJoueur();
    deplacerEnnemis();
    verifierCollisions();
    mettreAJourParticules();
    gererProjectiles();
    gererPowerups();
    if (flashRouge > 0) {
      ctx.fillStyle = "rgba(255,0,68," + (flashRouge / 30) + ")";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      flashRouge--;
    }
    for (let e of ennemis) {
      ctx.fillStyle = e.couleur;
      ctx.fillRect(e.x, e.y, e.taille, e.taille);
      if (e.vieMax > 1) {
        ctx.fillStyle = "#333"; ctx.fillRect(e.x, e.y - 8, e.taille, 4);
        ctx.fillStyle = e.couleur; ctx.fillRect(e.x, e.y - 8, (e.vie / e.vieMax) * e.taille, 4);
      }
    }
    dessinerJoueur();
    dessinerParticules();
    dessinerHUD();
  } else if (etatJeu === ETAT.GAMEOVER) {
    dessinerGameOver();
  }
  requestAnimationFrame(dessiner);
}

dessiner();
