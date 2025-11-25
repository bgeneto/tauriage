import os
from PIL import Image

def generate_icons():
    source_path = r"C:\Users\bernh\Documents\GitHub\tauriage\src-tauri\icons\icon.png"
    dest_dir = r"C:\Users\bernh\Documents\GitHub\tauriage\src-tauri\icons"

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

    # Generate icon.ico
    # ICO also supports multiple sizes.
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_images = []
    for size in ico_sizes:
        try:
            resized = img.resize(size, Image.Resampling.LANCZOS)
            ico_images.append(resized)
        except Exception as e:
            print(f"Error creating size {size} for ICO: {e}")
            
    if ico_images:
        try:
            ico_path = os.path.join(dest_dir, "icon.ico")
            # Pillow saves ICO with all sizes if passed as append_images?
            # Actually for ICO, Pillow format='ICO' supports sizes parameter or append_images?
            # It seems Pillow's ICO plugin handles saving multiple sizes if you pass them.
            # But the standard way is similar to ICNS or just saving one image with sizes=[...]?
            # Actually, standard Pillow save(fp, format='ICO', sizes=[(w,h), ...]) might resize itself?
            # Or better: img.save(fp, format='ICO', sizes=[...])
            # But we already resized them for better quality control (LANCZOS).
            # So we use append_images.
            
            primary = ico_images[0] # Start with small or large? 
            # Pillow docs say: "The sizes argument ... is a list of sizes ... to be included ... "
            # If we have separate images, we can use append_images.
            
            # Let's use the largest as primary and append others?
            # Or just use the largest and let Pillow resize? 
            # "If the image is not one of the supported sizes, it will be resized."
            # But we want high quality resizing.
            
            # Let's try appending.
            primary = ico_images[-1] # Largest (256x256)
            others = ico_images[:-1]
            # Note: ICO format in Pillow might expect the images to be in the list.
            primary.save(ico_path, format='ICO', append_images=others)
            print("Generated icon.ico")
        except Exception as e:
            print(f"Failed to generate icon.ico: {e}")

if __name__ == "__main__":
    generate_icons()
