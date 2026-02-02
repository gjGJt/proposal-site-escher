import './style.css';
import { ParticleSystem } from './ParticleSystem.js';

document.querySelector('#app').innerHTML = `
  <canvas id="canvas"></canvas>
  <div id="start-prompt" class="fade-in">
    <p>Loading...</p>
  </div>
  
  <div id="ui-layer" class="hidden">
    <div id="input-container">
      <input type="text" id="answer-input" placeholder="Type your answer..." autocomplete="off" />
      <p id="error-message" class="error-text">Please contact the site admin, who took a lot of time to make this, with any queries or concerns.</p>
    </div>
  </div>

  <div id="success-layer" class="hidden">
    <!-- Success text updated per user request -->
    <h1 class="fade-in-slow">we have progressed to the next level</h1>
  </div>
`;

import escherUrl from '/escher.png?url';

const system = new ParticleSystem('canvas', escherUrl);
// Initialize system and wait for assets
try {
  await system.init();
} catch (e) {
  console.error("Failed to load assets", e);
}

let hasStarted = false;
let isReady = true;

const startPrompt = document.getElementById('start-prompt');
const uiLayer = document.getElementById('ui-layer');
const input = document.getElementById('answer-input');
const errorMsg = document.getElementById('error-message');
const successLayer = document.getElementById('success-layer');

// Update prompt when ready
startPrompt.querySelector('p').innerText = "Click Anywhere to Begin";

document.addEventListener('click', () => {
  if (isReady && !hasStarted) {
    hasStarted = true;
    startPrompt.style.opacity = 0;
    setTimeout(() => startPrompt.remove(), 1000);

    // Intro Sequence: Escher -> "Will you be my girlfriend?"
    system.morphToText("Will you be my girlfriend?");

    setTimeout(() => {
      uiLayer.classList.remove('hidden');
      uiLayer.classList.add('active');
      input.focus();
    }, 4000); // 4s for slower, majestic morph
  }
});

input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const answer = input.value.trim().toLowerCase();
    const validAffirmations = ['yes', 'yeah', 'yep', 'ok', 'okay', 'sure', 'definitely', 'absolutely', 'of course'];

    if (validAffirmations.some(word => answer.includes(word))) {
      // Success Flow

      // 1. Hide UI
      uiLayer.classList.add('hidden');

      // 2. Morph to "We have progressed..."
      system.morphToText("We have progressed to the next level");

      // 3. Wait, then Morph to Heart
      setTimeout(() => {
        system.morphToHeart();

        // 4. Wait/Beat for ~4 seconds then Disintegrate -> GOL
        setTimeout(() => {
          system.disintegrateToGoL();
        }, 4000);
      }, 3000);

    } else {
      errorMsg.classList.add('show');
      input.classList.add('shake');
      setTimeout(() => {
        input.classList.remove('shake');
        errorMsg.classList.remove('show');
      }, 5000);
    }
  }
});
