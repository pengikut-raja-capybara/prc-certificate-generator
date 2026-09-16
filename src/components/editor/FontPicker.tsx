import React from 'react';
import { POPULAR_FONTS, loadGoogleFont } from '../../lib/font-loader';

interface FontPickerProps {
  value?: string;
  onChange: (fontName: string) => void;
}

export const FontPicker: React.FC<FontPickerProps> = ({ value = 'Inter', onChange }) => {
  const handleSelect = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = e.target.value;
    await loadGoogleFont(selected);
    onChange(selected);
  };

  return (
    <div className="font-picker">
      <select
        className="form-select"
        value={value}
        onChange={handleSelect}
        style={{ fontFamily: value }}
      >
        {POPULAR_FONTS.map((font) => (
          <option key={font.name} value={font.name} style={{ fontFamily: font.name }}>
            {font.name} ({font.category})
          </option>
        ))}
      </select>
    </div>
  );
};
