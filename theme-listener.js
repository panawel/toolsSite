(function () {
    // Theme Handler for Sub-Apps
    function applyTheme(theme) {
        const body = document.body;

        // Remove existing theme classes
        body.classList.remove('dark-theme', 'light-theme');

        // Add the requested theme class
        if (theme === 'dark') {
            body.classList.add('dark-theme');
        } else {
            body.classList.add('light-theme');
        }
    }

    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'setTheme') {
            applyTheme(event.data.theme);
        }
    });
})();
