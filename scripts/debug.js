// Utilities to make development easier. This file should be ignored in production.

(function () {
	var debug = window.debug;
	window.debug = null;
	
	var isMobile = {
		Android: function () { return navigator.userAgent.match(/Android/i); },
		BlackBerry: function () { return navigator.userAgent.match(/BlackBerry/i); },
		iOS: function () { return navigator.userAgent.match(/iPhone|iPad|iPod/i); },
		Opera: function () { return navigator.userAgent.match(/Opera Mini/i); },
		Windows: function () { return navigator.userAgent.match(/IEMobile/i); },
		any: function () { return (isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows()); }};
	
	/// Set up the Runs Per Second counter
	$('body').append('<div id="rps" style="position:absolute;bottom:0;right:0;color:#0FF;"></div>');
	window.RPScount = 1;
	window.RPSlast = Date.now();
	window.RPSsmooth = [];			//Accumulate runs here until we display their average (once every 75 iterations)
	
	window.rps = function () {		//Display the number of times we're looping per second
		var now = Date.now();
		RPSsmooth.push(now - RPSlast);
		RPScount++;
		RPScount = RPScount % 75;	//Don't update the display constantly and slow things down.
		if (!RPScount) {
			document.getElementById('rps').innerHTML = 1000 / (RPSsmooth.reduce(function(a, b) { return a + b }) / 75) | 0;
			RPSsmooth = [];
		}
		RPSlast = now;
	}
	
	/// Set up firebug
	if (debug.firebug) {
		window.firebugHandle = {
			enable:	function () {
				window.location.href = "javascript:(function(F,i,r,e,b,u,g,L,I,T,E){if(F.getElementById(b))return;E=F[i+'NS']&&F.documentElement.namespaceURI;E=E?F[i+'NS'](E,'script'):F[i]('script');E[r]('id',b);E[r]('src',I+g+T);E[r](b,u);(F[e]('head')[0]||F[e]('body')[0]).appendChild(E);E=new%20Image;E[r]('src',I+L);})(document,'createElement','setAttribute','getElementsByTagName','FirebugLite','4','firebug-lite.js','releases/lite/latest/skin/xp/sprite.png','https://getfirebug.com/','#startOpened');";},
			show:	function () {
				Firebug.chrome.open(); },
			hide:	function () {
				Firebug.chrome.close(); }};
	}
	
	/// Set up spotneedle
	if (debug.remote) {
		$.getScript('https://www.spotneedle.com/observed/9a9f1b4b-d6ac-43e1-8d1c-f98905fb6adb'); }

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//THIS IS LEAGUES FASTER THAN MONKEYPATCHING RPS INTO THE FUNCTION (BUT IT'S STILL SLOW)///////////////////////////////////////////

	GameBoyCore.prototype.run = function () {
		rps();
		//The preprocessing before the actual iteration loop:
		if ((this.stopEmulator & 2) === 0) {
			if ((this.stopEmulator & 1) === 1) {
				if (!this.CPUStopped) {
					this.stopEmulator = 0;
					this.audioUnderrunAdjustment();
					this.clockUpdate();			//RTC clocking.
					if (!this.halt) {
						this.executeIteration();
					}
					else {						//Finish the HALT rundown execution.
						this.CPUTicks = 0;
						this.calculateHALTPeriod();
						if (this.halt) {
							this.updateCore();
							this.iterationEndRoutine();
						}
						else {
							this.executeIteration();
						}
					}
					//Request the graphics target to be updated:
					this.requestDraw();
				}
				else {
					this.audioUnderrunAdjustment();
					this.audioTicks += this.CPUCyclesTotal;
					this.audioJIT();
					this.stopEmulator |= 1;			//End current loop.
				}
			}
			else {		//We can only get here if there was an internal error, but the loop was restarted.
				console.error("Iterator restarted a faulted core.");
				pause();
			}
		}
	};
})();