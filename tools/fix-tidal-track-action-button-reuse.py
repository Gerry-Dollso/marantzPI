from pathlib import Path

path = Path('public/tidal-ui.js')
text = path.read_text()

old = """  } catch (error) {
    tidalStatus.textContent = error.message;
    actionButton.disabled = false;
    actionButton.classList.remove('loading');
  }
}
"""

new = """  } catch (error) {
    tidalStatus.textContent = error.message;
  } finally {
    actionButton.disabled = false;
    actionButton.classList.remove('loading');
  }
}
"""

count = text.count(old)
if count != 1:
    raise SystemExit(f'track action completion anchor count was {count}, expected 1')

text = text.replace(old, new, 1)
path.write_text(text)
print('Inserted reusable TIDAL track action button completion handling')
