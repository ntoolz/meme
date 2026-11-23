
if ("serviceWorker" in navigator) {
    //window.addEventListener("load", function() {
      navigator.serviceWorker
        .register("sw.js")
        .then(res => console.log("service worker registered"))
        .catch(err => console.log("service worker not registered", err))
    //})
}

 const els = {
      themeToggle: document.getElementById("themeToggle"),
      dropzone: document.getElementById("dropzone"),
      fileInput: document.getElementById("fileInput"),
      imageScale: document.getElementById("imageScale"),
      imageScaleVal: document.getElementById("imageScaleVal"),
      imageDimsVal: document.getElementById("imageDimsVal"),
      resetScale: document.getElementById("resetScale"),
      topText: document.getElementById("topText"),
      bottomText: document.getElementById("bottomText"),
      topHeight: document.getElementById("topHeight"),
      bottomHeight: document.getElementById("bottomHeight"),
      topHeightVal: document.getElementById("topHeightVal"),
      bottomHeightVal: document.getElementById("bottomHeightVal"),
      topBg: document.getElementById("topBg"),
      topFg: document.getElementById("topFg"),
      bottomBg: document.getElementById("bottomBg"),
      bottomFg: document.getElementById("bottomFg"),
      fontSize: document.getElementById("fontSize"),
      fontSizeVal: document.getElementById("fontSizeVal"),
      fontFamily: document.getElementById("fontFamily"),
      exportPng: document.getElementById("exportPng"),
      exportJpg: document.getElementById("exportJpg"),
      copyImg: document.getElementById("copyImg"),
      status: document.getElementById("status"),
      canvas: document.getElementById("memeCanvas"),
      emptyState: document.getElementById("emptyState"),
    };

    const ctx = els.canvas.getContext("2d");
    let sourceImage = null;

    function applyTheme(theme) {
      const normalized = theme === "light" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", normalized);
      els.themeToggle.textContent = normalized === "dark" ? "Theme: Light" : "Theme: Dark";
    }

    // Default to dark theme on load
    applyTheme("dark");

    function toggleTheme() {
      const current = document.documentElement.getAttribute("data-theme");
      applyTheme(current === "dark" ? "light" : "dark");
    }

    els.themeToggle.addEventListener("click", toggleTheme);
    els.themeToggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleTheme();
      }
    });

    function setStatus(msg, type = "") {
      els.status.textContent = msg;
      els.status.className = `status ${type}`.trim();
    }

    function loadImageFromBlobOrFile(blob) {
      if (!blob || !blob.type.startsWith("image/")) {
        setStatus("Please provide a valid image file.", "err");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          sourceImage = img;
          els.imageScale.disabled = false;
          els.resetScale.disabled = false;
          els.imageScale.value = "100";
          els.canvas.classList.add("has-image");
          els.emptyState.classList.add("hidden");
          els.exportPng.disabled = false;
          els.exportJpg.disabled = false;
          els.copyImg.disabled = false;
          renderMeme();
          setStatus("Image loaded.", "ok");
        };
        img.onerror = () => setStatus("Failed to decode image.", "err");
        img.src = event.target.result;
      };
      reader.readAsDataURL(blob);
    }

    function drawStripText(text, stripY, stripHeight, bgColor, fgColor, fontSize, fontFamily) {
      const width = els.canvas.width;

      ctx.fillStyle = bgColor;
      ctx.fillRect(0, stripY, width, stripHeight);

      if (stripHeight <= 0 || !text.trim()) return;

      const lines = text.split("\n");
      const lineHeight = fontSize * 1.2;
      const totalTextHeight = lines.length * lineHeight;

      ctx.fillStyle = fgColor;
      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const startY = stripY + stripHeight / 2 - totalTextHeight / 2 + lineHeight / 2;
      const maxWidth = Math.max(20, width - 32);

      lines.forEach((line, idx) => {
        const y = startY + idx * lineHeight;
        ctx.fillText(line, width / 2, y, maxWidth);
      });
    }

    function renderMeme() {
      if (!sourceImage) return;

      const scalePct = Number(els.imageScale.value);
      const scale = scalePct / 100;
      const topH = Number(els.topHeight.value);
      const bottomH = Number(els.bottomHeight.value);
      const fontSize = Number(els.fontSize.value);
      const fontFamily = els.fontFamily.value;

      const origW = sourceImage.naturalWidth || sourceImage.width;
      const origH = sourceImage.naturalHeight || sourceImage.height;
      const imgW = Math.max(1, Math.round(origW * scale));
      const imgH = Math.max(1, Math.round(origH * scale));

      els.imageScaleVal.textContent = `${scalePct}%`;
      els.imageDimsVal.textContent = `${imgW} × ${imgH}px (orig ${origW} × ${origH})`;
      els.topHeightVal.textContent = `${topH}px`;
      els.bottomHeightVal.textContent = `${bottomH}px`;
      els.fontSizeVal.textContent = `${fontSize}px`;

      els.canvas.width = imgW;
      els.canvas.height = topH + imgH + bottomH;

      drawStripText(
        els.topText.value,
        0,
        topH,
        els.topBg.value,
        els.topFg.value,
        fontSize,
        fontFamily
      );

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(sourceImage, 0, topH, imgW, imgH);

      drawStripText(
        els.bottomText.value,
        topH + imgH,
        bottomH,
        els.bottomBg.value,
        els.bottomFg.value,
        fontSize,
        fontFamily
      );
    }

    function downloadCanvas(mimeType, extension) {
      if (!sourceImage) return;
      renderMeme();

      const quality = mimeType === "image/jpeg" ? 0.92 : undefined;
      els.canvas.toBlob((blob) => {
        if (!blob) {
          setStatus("Export failed.", "err");
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `meme.${extension}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setStatus(`Exported as ${extension.toUpperCase()}.`, "ok");
      }, mimeType, quality);
    }

    async function copyImageToClipboard() {
      if (!sourceImage) return;
      renderMeme();

      if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
        setStatus("Clipboard image copy is not supported in this browser/context.", "err");
        return;
      }

      els.canvas.toBlob(async (blob) => {
        if (!blob) {
          setStatus("Could not generate image blob.", "err");
          return;
        }
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob })
          ]);
          setStatus("Meme copied to clipboard!", "ok");
        } catch (err) {
          setStatus("Clipboard permission denied (try running over HTTPS or localhost).", "err");
        }
      }, "image/png");
    }

    els.resetScale.addEventListener("click", () => {
      els.imageScale.value = "100";
      renderMeme();
    });

    els.dropzone.addEventListener("click", () => els.fileInput.click());
    els.dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        els.fileInput.click();
      }
    });

    els.fileInput.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) loadImageFromBlobOrFile(file);
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      els.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        els.dropzone.classList.add("dragover");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      els.dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        els.dropzone.classList.remove("dragover");
      });
    });

    els.dropzone.addEventListener("drop", (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (file) loadImageFromBlobOrFile(file);
    });

    window.addEventListener("paste", (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const blob = item.getAsFile();
          if (blob) {
            loadImageFromBlobOrFile(blob);
            break;
          }
        }
      }
    });

    [
      els.imageScale,
      els.topText,
      els.bottomText,
      els.topHeight,
      els.bottomHeight,
      els.topBg,
      els.topFg,
      els.bottomBg,
      els.bottomFg,
      els.fontSize,
      els.fontFamily,
    ].forEach((input) => {
      input.addEventListener("input", renderMeme);
      input.addEventListener("change", renderMeme);
    });

    els.exportPng.addEventListener("click", () => downloadCanvas("image/png", "png"));
    els.exportJpg.addEventListener("click", () => downloadCanvas("image/jpeg", "jpg"));
    els.copyImg.addEventListener("click", copyImageToClipboard);
