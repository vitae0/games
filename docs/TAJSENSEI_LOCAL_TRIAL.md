# TajSensei Stylized Modular Characters - local test

Official creator page: https://tajsensei.itch.io/stylized-modular-characters

## Why no TajSensei model in git?

The creator offers `Free Male Character.rar` (~4.8 MB) as a zero-price download.
The broader male/female content is a separate paid tier (US$9.90 at time of
inspection). The listing does not state a clear license authorizing
redistribution, and the comments ask the creator about licensing.
Free download is not the same thing as CC0, public redistribution permission,
or commercial permission. **Do not commit third-party model binaries to this
public repository without explicit license/permission.**

## How to test inside VitaeWorld

1. Download `Free Male Character.rar` from the **creator's** itch.io page.
2. Extract it locally with an RAR-capable utility.
3. In the archive, look for an FBX character mesh with skeleton. If there is
   only a Unity package, import it into Unity then export an FBX or GLB.
   Blender can also export GLB after importing the character and arranging
   meshes and material slots.
4. Open VitaeWorld's character editor (K), choose **FBX / GLB / VRM YÜKLE**,
   and select your extracted or converted character file.
5. Inspect the **mesh visibility** list. Each switch changes a REAL imported
   mesh visibility bit, independently from the underlying anatomy.
   Use **TÜM PARÇALARI GÖSTER** to restore visibility.

The original characters are **not** distributed in this demo. The model lives
only in the current browser session and is never uploaded. Reloading the page
restores the bundled Quaternius default unless a profile says otherwise.

## Known caveats

- External FBX textures may be separate files and are not automatically found
  from a single FBX upload. For a faithful material test, pack your textures
  into a GLB with Blender before uploading.
- No claim of automatic TajSensei clothing compatibility or separate bones
  until the actual FBX assets have been inspected.
- A mesh list can include skin, eyes, hair and clothes. Switch visibility
  deliberately; names depend on the artist's export and are NOT guaranteed
  to identify garment categories.
- Source animations are not included in the original pack; our humanoid rig
  driver provides basic motion if bone names are recognized.
- Individual model import is limited to 75 MiB for FBX and 25 MiB for GLB/VRM.
- `.rar` and `.unitypackage` are not supported directly in the browser.
