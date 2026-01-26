document.addEventListener('DOMContentLoaded', () => {
    const checkboxes = document.querySelectorAll('.tool-item input');
    const gridContainer = document.getElementById('gridContainer');
    const themeToggle = document.getElementById('themeToggle');
    const sidebarWrapper = document.getElementById('sidebar-wrapper');
    const emptyState = document.querySelector('.empty-state');

    const MAX_APPS = 4;
    const LOCAL_STORAGE_THEME_KEY = 'toolsSiteTheme';

    // State
    let activeApps = new Map();

    // Theme Logic
    let currentTheme = localStorage.getItem(LOCAL_STORAGE_THEME_KEY) || 'light';

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(LOCAL_STORAGE_THEME_KEY, theme);
        currentTheme = theme;
        activeApps.forEach(iframe => {
            notifyIframeTheme(iframe, theme);
        });
    }

    function notifyIframeTheme(iframe, theme) {
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ type: 'setTheme', theme: theme }, '*');
        }
    }

    applyTheme(currentTheme);

    themeToggle.addEventListener('click', () => {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(newTheme);
    });

    // Mobile resizing logic
    window.addEventListener('resize', () => {
        const isMobile = window.matchMedia("(max-width: 768px)").matches;
        if (isMobile && activeApps.size > 1) {
            // Keep the most recently added app, or just the first one?
            // Let's keep the last one likely, or just clear all but one.
            // Implementation: Uncheck all except the last one inserted.
            let keptOne = false;
            // Iterate map in reverse or just take keys
            const keys = Array.from(activeApps.keys());
            // Keep the last opened one (last in Map)
            const idToKeep = keys[keys.length - 1];

            checkboxes.forEach(cb => {
                if (cb.value !== idToKeep && cb.checked) {
                    cb.checked = false;
                    removeApp(cb.value);
                }
            });
            updateGridLayout();
        }
    });

    // App Selection Logic
    checkboxes.forEach(cb => {
        // Initial check for pre-checked items (none by default, but good practice)
        if (cb.checked) {
            // Logic to handle pre-checked? Typically we start fresh.
        }

        cb.addEventListener('change', (e) => {
            const val = e.target.value;
            const path = e.target.dataset.path;
            const isMobile = window.matchMedia("(max-width: 768px)").matches;

            if (e.target.checked) {
                // Mobile: Only 1 app allowed
                if (isMobile) {
                    // Uncheck and remove all others
                    checkboxes.forEach(box => {
                        if (box !== e.target && box.checked) {
                            box.checked = false;
                            removeApp(box.value);
                        }
                    });
                }
                // Desktop: Max 4 apps check
                else if (activeApps.size >= MAX_APPS) {
                    e.target.checked = false;
                    alert('Maximum 4 applications allowed in split screen.');
                    return;
                }

                addApp(val, path);
            } else {
                removeApp(val);
            }
            updateGridLayout();
        });
    });

    function addApp(id, path) {
        if (emptyState) emptyState.style.display = 'none';

        const frameWrapper = document.createElement('div');
        frameWrapper.className = 'app-frame';
        frameWrapper.id = `frame-${id}`;

        const iframe = document.createElement('iframe');
        iframe.src = path;

        iframe.onload = () => {
            notifyIframeTheme(iframe, currentTheme);
        };

        frameWrapper.appendChild(iframe);
        gridContainer.appendChild(frameWrapper);

        activeApps.set(id, iframe);
    }

    function removeApp(id) {
        const frameWrapper = document.getElementById(`frame-${id}`);
        if (frameWrapper) {
            frameWrapper.remove();
        }
        activeApps.delete(id);

        if (activeApps.size === 0 && emptyState) {
            emptyState.style.display = 'flex';
        }
    }

    function updateGridLayout() {
        gridContainer.setAttribute('data-count', activeApps.size);
    }

    // === Context Menu Logic ===
    const contextMenu = document.getElementById('context-menu');
    const openNewWindowBtn = document.getElementById('openNewWindow');
    let rightClickedPath = null;
    let rightClickedId = null;

    // Attach right-click listener to tool items
    checkboxes.forEach(cb => {
        const label = cb.parentElement; // The .tool-item label
        label.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            rightClickedPath = cb.dataset.path;
            rightClickedId = cb.value;

            // Position (mouse coordinates)
            let { clientX: mouseX, clientY: mouseY } = e;

            // Viewport bounds check for context menu
            contextMenu.style.display = 'block'; // Show first to get dimensions
            const menuWidth = contextMenu.offsetWidth;
            const menuHeight = contextMenu.offsetHeight;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            if (mouseX + menuWidth > viewportWidth) {
                mouseX = viewportWidth - menuWidth - 10;
            }
            if (mouseY + menuHeight > viewportHeight) {
                mouseY = viewportHeight - menuHeight - 10;
            }

            contextMenu.style.top = `${mouseY}px`;
            contextMenu.style.left = `${mouseX}px`;
        });
    });

    // Close menu on click elsewhere
    document.addEventListener('click', (e) => {
        if (e.target.closest('#context-menu') === null) {
            contextMenu.style.display = 'none';
        }
    });

    // Window sizes map
    const windowSizes = {
        'email': { width: 1100, height: 750 },
        'events': { width: 500, height: 750 },
        'russia': { width: 450, height: 550 },
        'timer': { width: 450, height: 550 },
        'uniqslots': { width: 1000, height: 750 }
    };

    // Handle "Open in New Window"
    openNewWindowBtn.addEventListener('click', () => {
        contextMenu.style.display = 'none';
        if (rightClickedPath) {
            const size = windowSizes[rightClickedId] || { width: 900, height: 700 };

            // Center the window
            const left = (window.screen.width - size.width) / 2;
            const top = (window.screen.height - size.height) / 2;

            // Standard flags for maximal compatibility across Chrome/Safari/Brave
            const features = `width=${size.width},height=${size.height},left=${left},top=${top},toolbar=no,menubar=no,location=no,status=no,scrollbars=yes,resizable=yes`;

            const newWindow = window.open(rightClickedPath, '_blank', features);

            if (newWindow) {
                const sendTheme = () => {
                    newWindow.postMessage({ type: 'setTheme', theme: currentTheme }, '*');
                };
                setTimeout(sendTheme, 300);
                setTimeout(sendTheme, 1000);
            }
        }
    });
});
