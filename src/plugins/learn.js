// OpenAI Codex assisted with the Learn mode implementation from team requirements.
(() => {
  const challenges = [
    {
      prompt: 'Find a date when IM-2 Athena has both sunlight and Earth in view.',
      correct: (s, api) => s.siteId === 'im2' && api.isUp(s, s.cur.sun) && api.isUp(s, s.cur.earth),
      explanation: 'With both the Sun and Earth above the local skyline, a lander can get solar power and communicate directly with Earth.'
    },
    {
      prompt: 'Which site in the list can never talk to Earth directly? Select it.',
      correct: s => s.siteId === 'ce6',
      explanation: 'Chang’e 6 landed on the lunar far side, where the Moon itself blocks a direct line of sight to Earth.'
    },
    {
      prompt: 'Find a time when the Sun is above 0° at IM-1 Odysseus but hidden behind its crater wall.',
      correct: (s, api) => s.siteId === 'im1' && s.cur.sun.el > 0 && !api.isUp(s, s.cur.sun),
      explanation: 'The Sun is above the flat horizon, but the terrain raises the skyline enough to block it.'
    }
  ];

  (window.MoonWindowPlugins = window.MoonWindowPlugins || []).push({
    name: 'learn',
    renderTop(slot, api) {
      if (slot.firstElementChild) return;
      const section = document.createElement('section');
      section.className = 'mw-learn';
      section.innerHTML = '<h2>Moon challenges</h2><p class="muted">Use scenario A.</p>';
      const list = document.createElement('ol');
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      for (const challenge of challenges) {
        const item = document.createElement('li');
        const prompt = document.createElement('p');
        prompt.textContent = challenge.prompt;
        const button = document.createElement('button');
        button.className = 'btn small';
        button.type = 'button';
        button.textContent = 'Check my answer';
        const feedback = document.createElement('p');
        feedback.setAttribute('role', 'status');
        feedback.className = 'mw-learn-feedback';
        const result = document.createElement('strong');
        const icon = document.createElement('span');
        icon.className = 'mw-learn-icon';
        icon.setAttribute('aria-hidden', 'true');
        const label = document.createTextNode('');
        result.append(icon, label);
        const explanation = document.createElement('span');
        let animation;
        button.addEventListener('click', () => {
          const scenario = api.scenarios()[0];
          const correct = scenario && challenge.correct(scenario, api);
          icon.textContent = correct ? '✓' : '✕';
          label.textContent = correct ? 'Correct' : 'Incorrect';
          result.className = 'mw-learn-result ' + (correct ? 'best' : 'mw-plugin-error');
          explanation.textContent = correct ? challenge.explanation : 'Try another site or time in scenario A.';
          if (!feedback.firstChild) feedback.append(result, explanation);

          animation?.cancel();
          if (reducedMotion.matches) return;
          const transforms = correct
            ? ['scale(0.75)', 'scale(1.32)', 'scale(0.95)', 'scale(1.05)', 'scale(1)']
            : ['translateX(0)', 'translateX(10px)', 'translateX(-8px)',
              'translateX(5px)', 'translateX(-3px)', 'translateX(0)'];
          animation = result.animate(transforms.map(transform => ({transform})), {
            duration: correct ? 520 : 420, easing: 'ease-in-out'
          });
        });
        item.append(prompt, button, feedback);
        list.append(item);
      }
      section.append(list);
      slot.append(section);
    }
  });
})();
