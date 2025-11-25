import os
from PIL import Image

def generate_icons():
    source_path = r"C:\Users\bernh\Documents\GitHub\TauriAge\src-tauri\icons\icon.png"
    dest_dir = r"C:\Users\bernh\Documents\GitHub\TauriAge\src-tauri\icons"

    if not os.path.exists(source_path):
        print(f"Error: Source file not found at {source_path}")
        return

    try:
        img = Image.open(source_path)
    except Exception as e:
        print(f"Error opening image: {e}")
        return

    # List of (filename, size)
    icons_to_generate = [
        ("32x32.png", (32, 32)),
        ("128x128.png", (128, 128)),
        ("128x128@2x.png", (256, 256)), # @2x usually means double resolution
        ("Square30x30Logo.png", (30, 30)),
        ("Square44x44Logo.png", (44, 44)),
        ("Square71x71Logo.png", (71, 71)),
        ("Square89x89Logo.png", (89, 89)),
        ("Square107x107Logo.png", (107, 107)),
        ("Square142x142Logo.png", (142, 142)),
        ("Square150x150Logo.png", (150, 150)),
        ("Square284x284Logo.png", (284, 284)),
        ("Square310x310Logo.png", (310, 310)),
        ("StoreLogo.png", (50, 50)), # StoreLogo size varies, often 50x50 or larger. Using 50x50 as placeholder or standard if not specified.
    ]
    
    for filename, size in icons_to_generate:
        try:
            # Resize with LANCZOS for high quality
            resized_img = img.resize(size, Image.Resampling.LANCZOS)
            save_path = os.path.join(dest_dir, filename)
            resized_img.save(save_path)
            print(f"Generated {filename} ({size[0]}x{size[1]})")
        except Exception as e:
            print(f"Failed to generate {filename}: {e}")

    # Generate icon.icns
    # ICNS requires specific sizes. We'll create a list of images.
    icns_sizes = [(16, 16), (32, 32), (64, 64), (128, 128), (256, 256), (512, 512), (1024, 1024)]
    icns_images = []
    for size in icns_sizes:
        try:
            resized = img.resize(size, Image.Resampling.LANCZOS)
            icns_images.append(resized)
        except Exception as e:
            print(f"Error creating size {size} for ICNS: {e}")
    
    if icns_images:
        try:
            icns_path = os.path.join(dest_dir, "icon.icns")
            
            primary = icns_images[-1] # Largest
            others = icns_images[:-1]
            primary.save(icns_path, format='ICNS', append_images=others)
            print("Generated icon.icns")
        except Exception as e:
            print(f"Failed to generate icon.icns: {e}")

        except Exception as e:
            print(f"Failed to generate icon.icns: {e}")

    # Generate icon.ico as 128x128
    try:
        ico_path = os.path.join(dest_dir, "icon.ico")
        resized_128 = img.resize((128, 128), Image.Resampling.LANCZOS)
        resized_128.save(ico_path, format='ICO')
        print("Generated icon.ico (128x128)")
    except Exception as e:
        print(f"Failed to generate icon.ico: {e}")

if __name__ == "__main__":
    generate_icons()
