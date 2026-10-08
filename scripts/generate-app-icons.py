from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

output = Path(__file__).resolve().parents[1] / 'public' / 'icons'
output.mkdir(parents=True, exist_ok=True)
image = Image.new('RGB', (1024, 1024), '#163c35')
draw = ImageDraw.Draw(image)
draw.rounded_rectangle((230, 230, 794, 794), radius=160, fill='#bed2a4')
font = ImageFont.truetype('C:/Windows/Fonts/georgiab.ttf', 540)
draw.text((512, 495), 'k', font=font, fill='#163c35', anchor='mm')
draw.ellipse((683, 377, 747, 441), fill='#6f8751')
for name, size in [('icon-192.png', 192), ('icon-512.png', 512), ('icon-maskable-512.png', 512), ('apple-touch-icon.png', 180)]:
    image.resize((size, size), Image.Resampling.LANCZOS).save(output / name)
