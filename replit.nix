{ pkgs }: {
	deps = [
		pkgs.nodejs-18_x
		pkgs.yarn
        pkgs.glib
        pkgs.chromium
	];
}