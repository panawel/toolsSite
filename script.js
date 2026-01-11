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
});
