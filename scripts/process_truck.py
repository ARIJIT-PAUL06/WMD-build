from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps
from collections import deque
import math

img_path = r'C:\Users\psuba\.gemini\antigravity-ide\brain\3f37b61d-3e96-448f-b32f-e50e7493b325\flatbed_truck_isolated_1791111720281.jpg'
img = Image.open(img_path).convert('RGB')
w, h = img.size

# 1. Flood fill from canvas borders to remove all exterior white
visited = bytearray(w * h)
bg_mask = Image.new('L', (w, h), 0)

queue = deque()
for x in range(w):
    queue.append((x, 0))
    queue.append((x, h - 1))
    visited[0 * w + x] = 1
    visited[(h - 1) * w + x] = 1

for y in range(h):
    queue.append((0, y))
    queue.append((w - 1, y))
    visited[y * w + 0] = 1
    visited[y * w + (w - 1)] = 1

while queue:
    x, y = queue.popleft()
    bg_mask.putpixel((x, y), 255)
    for nx, ny in ((x+1, y), (x-1, y), (x, y+1), (x, y-1)):
        if 0 <= nx < w and 0 <= ny < h:
            idx = ny * w + nx
            if not visited[idx]:
                visited[idx] = 1
                r, g, b = img.getpixel((nx, ny))
                if r > 215 and g > 215 and b > 215:
                    queue.append((nx, ny))

vehicle_mask = ImageOps.invert(bg_mask)

# 2. Perfect wheel geometry definitions
wheels = [
    (173, 503, 44),  # front wheel
    (588, 494, 44),  # mid cab wheel
    (991, 498, 44),  # trailer wheel 1
    (1114, 504, 44)  # trailer wheel 2
]

def in_any_wheel(x, y):
    for cx, cy, r in wheels:
        if (x - cx)**2 + (y - cy)**2 <= r**2:
            return True
    return False

# Clean undercarriage, wheels, and exterior air
for y in range(h):
    for x in range(w):
        # Above vehicle
        if y < 185:
            vehicle_mask.putpixel((x, y), 0)
            continue
        # Far left / far right
        if x < 60 or x > 1320:
            vehicle_mask.putpixel((x, y), 0)
            continue
        
        # Ground level under all wheels
        if y > 547:
            vehicle_mask.putpixel((x, y), 0)
            continue

        # Check undercarriage regions
        if y > 450:
            is_wheel = in_any_wheel(x, y)
            if is_wheel:
                # Keep wheel pixels if y <= 547
                continue
            
            # Outside wheels:
            if x < 129 and y > 460:
                vehicle_mask.putpixel((x, y), 0)
            elif 129 <= x <= 217 and y > 495:
                # Arch around Wheel 1
                vehicle_mask.putpixel((x, y), 0)
            elif 217 < x < 544 and y > 512:
                # Cab battery skirt
                vehicle_mask.putpixel((x, y), 0)
            elif 544 <= x <= 632 and y > 490:
                # Arch around Wheel 2
                vehicle_mask.putpixel((x, y), 0)
            elif 632 < x < 740 and y > 480:
                # Hitch bridge
                vehicle_mask.putpixel((x, y), 0)
            elif 740 <= x < 947 and y > 508:
                # Trailer belly toolbox
                vehicle_mask.putpixel((x, y), 0)
            elif 947 <= x <= 1035 and y > 495:
                # Arch around Wheel 3
                vehicle_mask.putpixel((x, y), 0)
            elif 1035 < x < 1070 and y > 480:
                # Gap between trailer wheels 3 & 4
                vehicle_mask.putpixel((x, y), 0)
            elif 1070 <= x <= 1158 and y > 495:
                # Arch around Wheel 4
                vehicle_mask.putpixel((x, y), 0)
            elif x > 1158 and y > 496:
                # Rear overhang
                vehicle_mask.putpixel((x, y), 0)

# Soft Gaussian edge for clean anti-aliasing (radius 0.6)
smooth_mask = vehicle_mask.filter(ImageFilter.GaussianBlur(radius=0.6))

rgba = img.convert('RGBA')
rgba.putalpha(smooth_mask)

# Brand VAYUVITALS on door
door_c = img.getpixel((315, 328))
draw = ImageDraw.Draw(rgba)
for y in range(320, 335):
    for x in range(326, 416):
        rgba.putpixel((x, y), (door_c[0], door_c[1], door_c[2], 255))

try:
    font = ImageFont.truetype('arialbd.ttf', 11)
except:
    font = ImageFont.load_default()

draw.text((328, 321), 'VAYUVITALS', fill=(6, 182, 212, 255), font=font)

rgba.save('public/assets/truck_flatbed_cyber.png')
print('Successfully saved public/assets/truck_flatbed_cyber.png')
