import { useState } from 'react';

export function AppearanceOptions({ controls }) {
  const [uploadError, setUploadError] = useState('');
  if (!controls) return null;
  const { customColors, setCustomColors, bubbleStyle, setBubbleStyle, backgroundImage, updateBackgroundImage, appearanceError } = controls;
  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setUploadError('Choose a PNG, JPEG, or WebP image up to 2 MB.'); return;
    }
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      const reader = new FileReader();
      reader.onload = () => { setUploadError(''); updateBackgroundImage(reader.result); };
      reader.onerror = () => setUploadError('Unable to read this image. Please try another.');
      reader.readAsDataURL(file);
    } catch { setUploadError('This image could not be opened. Please try another.'); }
  };
  return <div className="appearance-options">
    {controls.theme === 'custom' && <fieldset className="custom-color-picker">
      <legend>Custom colors</legend>
      {Object.entries(customColors).map(([key, value]) => <label key={key}>
        {{ accent: 'Accent', background: 'Chat background', bubble: 'Your messages' }[key]}
        <input type="color" value={value} onChange={event => setCustomColors(previous => ({ ...previous, [key]: event.target.value }))} />
      </label>)}
    </fieldset>}
    <label>Chat bubble style
      <select value={bubbleStyle} onChange={event => setBubbleStyle(event.target.value)}>
        <option value="classic">Classic</option><option value="rounded">Rounded</option><option value="square">Square</option>
      </select>
    </label>
    <label>Custom chat background
      <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} />
      <small>PNG, JPEG, or WebP, up to 2 MB. Saved on this device.</small>
    </label>
    {backgroundImage && <div className="background-image-preview">
      <img src={backgroundImage} alt="Selected chat background" />
      <button type="button" className="secondary" onClick={() => { updateBackgroundImage(''); setUploadError(''); }}>Remove background</button>
    </div>}
    {(uploadError || appearanceError) && <p className="form-error" role="alert">{uploadError || appearanceError}</p>}
    <button type="button" className="text-btn" onClick={() => {
      controls.setTheme('system'); controls.setFontSize('comfortable');
      setCustomColors({ accent: '#17483e', background: '#f8f9f5', bubble: '#e5ecdc' });
      setBubbleStyle('classic'); updateBackgroundImage(''); setUploadError('');
    }}>Reset appearance</button>
  </div>;
}
