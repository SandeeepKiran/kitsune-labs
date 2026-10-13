import './shared/fonts.ts';
import './shared/tokens.css';
import './shared/base.css';
import './home.css';

// M0 placeholder: proves tokens, fonts and the build work.
// The real fox landing page arrives in M2.
const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  app.innerHTML = `
    <main class="home">
      <h1 class="home__title">Kitsune Labs</h1>
      <p class="home__tagline">QA tools for conversational AI, forged in-house.</p>
      <p class="home__note"><code>M0 scaffold</code> · tools arrive in later milestones.</p>
    </main>
  `;
}
