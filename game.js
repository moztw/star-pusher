'use strict'

var loader = new PxLoader();
loader.addImage('images/front.png');
loader.addImage('images/back.png');
loader.addImage('images/left.png');
loader.addImage('images/right.png');
loader.addImage('images/Grass_Block.png');
loader.addImage('images/Plain_Block.png');
loader.addImage('images/RedSelector.png');
loader.addImage('images/Rock.png');
loader.addImage('images/Selector.png');
loader.addImage('images/Star.png');
loader.addImage('images/Tree_Short.png');
loader.addImage('images/Tree_Tall.png');
loader.addImage('images/Tree_Ugly.png');
loader.addImage('images/Wall_Block_Tall.png');
loader.addImage('images/Wood_Block_Tall.png');
loader.addProgressListener(function(e) {
	if (e.completedCount * 6 < 100) {
		document.getElementById('loading').querySelector('span').textContent = e.completedCount * 6 + '%';
	}
});
loader.addCompletionListener(function() {
	document.getElementById('loading').classList.add('hidden');
	start();
});
loader.start();


// The total width and height of each tile in pixels.
var TILEWIDTH = 50;
var TILEHEIGHT = 85;
var TILEFLOORHEIGHT = 40;

var OUTSIDE_DECORATION_PCT = 0.2;

var UP = 'up';
var DOWN = 'down';
var LEFT = 'left';
var RIGHT = 'right';

var mapNeedsRedraw = false;
var levelIsComplete = false;
var playerMoveTo = null;

var stage = document.getElementById('stage');
var sky = document.getElementById('sky');
var map = document.createElement('canvas');
var position = stage.getContext('2d');
var cloud = sky.getContext('2d');
var platform = map.getContext('2d');
var animation = true;

var currentLevelIndex = 0;

var files = {
				'uncovered goal': 'images/RedSelector.png',
				'covered goal': 'images/Selector.png',
				'star': 'images/Star.png',
				'corner': 'images/Wall_Block_Tall.png',
				'wall': 'images/Wood_Block_Tall.png',
				'inside floor': 'images/Plain_Block.png',
				'outside floor': 'images/Grass_Block.png',
				'front': 'images/front.png',
				'back': 'images/back.png',
				'left': 'images/left.png',
				'right': 'images/right.png',
				'rock': 'images/Rock.png',
				'short tree': 'images/Tree_Short.png',
				'tall tree': 'images/Tree_Tall.png',
				'ugly tree': 'images/Tree_Ugly.png'
			};
var IMAGESDICT = {};
for(var key in files) {
	IMAGESDICT[key] = new Image();
	IMAGESDICT[key].src = files[key];
	IMAGESDICT[key].width = TILEWIDTH;
	IMAGESDICT[key].height = TILEHEIGHT;
}
var TILEMAPPING = {
		'x': IMAGESDICT['corner'],
		'#': IMAGESDICT['wall'],
		'o': IMAGESDICT['inside floor'],
		' ': IMAGESDICT['outside floor']
};
			
var OUTSIDEDECOMAPPING = {
	'1': IMAGESDICT['rock'],
	'2': IMAGESDICT['short tree'],
	'3': IMAGESDICT['tall tree'],
	'4': IMAGESDICT['ugly tree']
}

var currentImage = 0;
var PLAYERIMAGES = [IMAGESDICT['front'],
                    IMAGESDICT['back'],
                    IMAGESDICT['left'],
                    IMAGESDICT['right']];


var clouds = 10, circles = [];
for (var i = 0; i < clouds; i++) {
	circles.push([
		Math.random() * sky.width,
		Math.random() * sky.height,
		0,
		Math.floor(Math.random() * (80-50+1)+50 * 100)
	]);
}
var drawCloud = function() {
	sky.width = document.documentElement.clientWidth; //clean the canvas
	sky.height = document.documentElement.clientHeight;
	if (!animation)
		return;
	for (var i = 0; i < clouds; i++) {
		if (circles[i][1] - circles[i][2] > sky.height) {
		  circles[i][0] = Math.random() * sky.width;
		  circles[i][2] = Math.random() * 100;
		  circles[i][1] = 0 - circles[i][2];
		  circles[i][3] = Math.random() / 2;
		} else {
		  circles[i][1] += 5;
		}
		cloud.fillStyle = 'rgba(255, 255, 255, ' + circles[i][3] + ')';
		cloud.beginPath();
		cloud.arc(circles[i][0], circles[i][1], circles[i][2], 0, Math.PI * 2, true);
		cloud.closePath();
		cloud.fill();
	}	
	requestAnimFrame(function(){
	    drawCloud();
	});
}

var drawMap = function() {
	var mapObj = levelObj['mapObj'];
	var baseTile;
	map.width = mapObj.length * TILEWIDTH;
	map.height = (mapObj[0].length - 1) * TILEFLOORHEIGHT + TILEHEIGHT;
	for (var x = 0; x < mapObj.length; x++) {
		for (var y = 0; y < mapObj[0].length; y++) {
			var tx = x * TILEWIDTH, ty = y * TILEFLOORHEIGHT;
			if (TILEMAPPING[mapObj[x][y]])
                baseTile = TILEMAPPING[mapObj[x][y]];
            else if (OUTSIDEDECOMAPPING[mapObj[x][y]])
                baseTile = TILEMAPPING[' '];
			platform.drawImage(baseTile, tx, ty);
			if (OUTSIDEDECOMAPPING[mapObj[x][y]]) {
                platform.drawImage(OUTSIDEDECOMAPPING[mapObj[x][y]], tx, ty);
            }
		}
	}
}

var drawStage = function() {
	var gameStateObj = levelObj['startState'];
	var goals = levelObj['goals'];
	stage.width = map.width;
	stage.height = map.height;
	position.drawImage(map, 0, 0);
	var revamp = function(x, y) {
		if (mapObj[x][y + 1] == 'x' || mapObj[x][y + 1] == '#') {
	   		position.drawImage(
	   			TILEMAPPING[mapObj[x][y + 1]],
	   			0, 0,
	   			TILEWIDTH, TILEFLOORHEIGHT,
	   			tx, ty + TILEFLOORHEIGHT,
	   			TILEWIDTH, TILEFLOORHEIGHT
	   		);
	   	}
	}
	for (var x = 0; x < mapObj.length; x++) {
		for (var y = 0; y < mapObj[0].length; y++) {
			var tx = x * TILEWIDTH, ty = y * TILEFLOORHEIGHT;
			if (hasItem(gameStateObj['stars'], x, y)) {
		        if (hasItem(goals, x, y))
		            position.drawImage(IMAGESDICT['covered goal'], tx, ty);
		    	position.drawImage(IMAGESDICT['star'], tx, ty);
				revamp(x, y);
            } else if (hasItem(goals, x, y)) {
                position.drawImage(IMAGESDICT['uncovered goal'], tx, ty);
   		    	revamp(x, y);
            }
            if (gameStateObj['player'][0] == x && gameStateObj['player'][1] == y) {
                position.drawImage(PLAYERIMAGES[currentImage], tx, ty);
   		    	revamp(x, y);
            }
		}
	}
}

var isLevelFinished = function(levelObj, gameStateObj) {
	var result = true;
    levelObj['goals'].forEach(function(element, index, array) {
    	var goal = element;
    	if (gameStateObj['stars'].every(function(element, index, array) {
			return element[0] != goal[0] || element[1] != goal[1];
		})) 
            result = false;
	});
    return result;
}

var isWall = function(mapObj, x, y) {
    if (x < 0 || x >= mapObj.length || y < 0 || y >= mapObj[x].length)
        return false;
    else if (['#', 'x'].indexOf(mapObj[x][y]) >= 0)
        return true;
    return false;
}

var decorateMap = function(mapObj, startxy) {
    var startx = startxy[0];
    var starty = startxy[1];
    
    var mapObjCopy = mapObj; //.slice(0);

    for (var x = 0; x < mapObjCopy.length; x++) {
		for (var y = 0; y < mapObjCopy[0].length; y++) {
            if (['$', '.', '@', '+', '*'].indexOf(mapObjCopy[x][y]) >= 0) {
                mapObjCopy[x][y] = ' ';
            }
    	}
	}

    floodFill(mapObjCopy, startx, starty, ' ', 'o');

	for (x = 0; x < mapObjCopy.length; x++) {
		for (y = 0; y < mapObjCopy[0].length; y++) {
			if (mapObjCopy[x][y] == '#') {
                if ((isWall(mapObjCopy, x, y-1) && isWall(mapObjCopy, x+1, y)) ||
                   (isWall(mapObjCopy, x+1, y) && isWall(mapObjCopy, x, y+1)) ||
                   (isWall(mapObjCopy, x, y+1) && isWall(mapObjCopy, x-1, y)) ||
                   (isWall(mapObjCopy, x-1, y) && isWall(mapObjCopy, x, y-1)))
                    mapObjCopy[x][y] = 'x';
			} else if (mapObjCopy[x][y] == ' ' && Math.random() < OUTSIDE_DECORATION_PCT) {
				var items = Object.keys(OUTSIDEDECOMAPPING);
				mapObjCopy[x][y] = items[Math.floor(Math.random() * items.length)];
			}
		}
	}
    return mapObjCopy;
};

var isBlocked = function(mapObj, gameStateObj, x, y) {
    if (isWall(mapObj, x, y))
        return true;
    else if (x < 0 || x >= mapObj.length || y < 0 || y >= mapObj[x].length)
        return true;
    else if (gameStateObj['stars'].some(function(element, index, array) {
			return element[0] == x && element[1] == y;
		}))
        return true;
    return false;
}

var makeMove = function (mapObj, gameStateObj, playerMoveTo) {
    var playerx = gameStateObj['player'][0];
    var playery = gameStateObj['player'][1];
    var stars = gameStateObj['stars'];
	var xOffset, yOffset;
	switch(playerMoveTo) {
		case UP:
			xOffset = 0;
		    yOffset = -1;
			break;
		case RIGHT:
			xOffset = 1;
		    yOffset = 0;
			break;
		case DOWN:
			xOffset = 0;
		    yOffset = 1;
			break;
		case LEFT:
			xOffset = -1;
	        yOffset = 0;
			break;
	}

    if (isWall(mapObj, playerx + xOffset, playery + yOffset))
        return false;
    else {
        if (hasItem(stars, playerx + xOffset, playery + yOffset)) {
            if (!isBlocked(mapObj, gameStateObj, playerx + (xOffset*2), playery + (yOffset*2)))
                stars.forEach(function(element, index, array) {
					if (element[0] == playerx + xOffset && element[1] == playery + yOffset) {
						array[index] = [array[index][0] + xOffset, array[index][1] + yOffset];
						if (hasItem(levelObj['goals'], array[index][0], array[index][1]))
							playSound('match');
					}
                });
			else
                return false;
        }
        gameStateObj['player'] = [playerx + xOffset, playery + yOffset];
        return true;
	}
}

var floodFill = function(mapObj, x, y, oldCharacter, newCharacter) {
    if (mapObj[x][y] == oldCharacter)
        mapObj[x][y] = newCharacter;
    if (x < mapObj.length - 1 && mapObj[x+1][y] == oldCharacter)
        floodFill(mapObj, x+1, y, oldCharacter, newCharacter);
    if (x > 0 && mapObj[x-1][y] == oldCharacter)
        floodFill(mapObj, x-1, y, oldCharacter, newCharacter);
    if (y < mapObj[x].length - 1 && mapObj[x][y+1] == oldCharacter)
        floodFill(mapObj, x, y+1, oldCharacter, newCharacter);
    if (y > 0 && mapObj[x][y-1] == oldCharacter)
        floodFill(mapObj, x, y-1, oldCharacter, newCharacter);
};

var parser = function(lines) {
	var levels = [];
    var levelNum = -1;
    var mapTextLines = [];
    var mapObj = [];
	lines.forEach(function(element, index, array) {
		var line = element.replace(/;.*$/, '');
		if (line != '') {
			mapTextLines.push(line);
		} else if (line == '' && mapTextLines.length > 0) {
			var maxWidth = -1;
			mapTextLines.forEach(function(element, index, array) {
				if (element.length > maxWidth) {
					maxWidth = element.length;
				}
			});
			mapTextLines.forEach(function(element, index, array) {
				for (i = 0; i < (maxWidth - element.length); i++)
					array[index] += ' ';
			});
			for (i = 0; i < maxWidth; i++) {
				mapObj.push([]);
			};
			for (var y = 0; y < mapTextLines.length; y++) {
				for (var x = 0; x < maxWidth; x++) {
					mapObj[x].push(mapTextLines[y][x]);						
				};
			};
			var startx = null;
            var starty = null;
            var goals = [];
            var stars = [];
            for (x = 0; x < maxWidth; x++) {
				for (y = 0; y < mapObj[x].length; y++) {
					if (mapObj[x][y] == '@' || mapObj[x][y] == '+') {
	                    startx = x;
	                    starty = y;
                    }
                    if (mapObj[x][y] == '.' || mapObj[x][y] == '+' || mapObj[x][y] == '*') {
                    	goals.push([x, y]);
                    }
                    if (mapObj[x][y] == '$' || mapObj[x][y] == '*') {
                        stars.push([x, y]);
	                }
				};
			};
			
			var lineNum = index - mapObj[0].length;
			
			if (startx == null || starty == null)
				alert('Level ' + (levelNum + 1) + ' (around line ' + lineNum + ') is missing a "@" or "+" to mark the start point.');
            if (goals.length < 1)
            	alert('Level ' + (levelNum + 1) + ' (around line ' + lineNum + ') must have at least one goal.');
            if (stars.length < goals.length) 
            	alert('Level ' + (levelNum + 1) + ' (around line ' + lineNum + ') is impossible to solve. It has ' + goals.length + ' goals but only ' + stars.length + ' stars.');
			
            var gameStateObj = {
				'player': [startx, starty],
				'stars': stars
			}
			var levelObj = {
				'width': maxWidth,
				'height': mapObj.length,
				'mapObj': decorateMap(mapObj, gameStateObj['player']),
				'goals': goals,
				'startState': gameStateObj,
				'steps': [deepCopy(gameStateObj)]
			}

			levels.push(levelObj);
			mapTextLines = [];
			mapObj = [];
			gameStateObj = {};
			levelNum += 1;
		}
	});
    return levels;
}

var run = function(ev) {
	var key = ev.which ? ev.which : ev;
	playerMoveTo = null;
    var gameStateObj = levelObj['startState'];
    if (!title.classList.contains('hidden')) {
    	playSound('intro');
    	document.getElementById('control').classList.add('enable');
    	title.classList.add('hidden');
    	reset();
    	return;
    }	
	if (levelIsComplete) {
		currentLevelIndex += 1;
		if (currentLevelIndex >= levels.length)
            currentLevelIndex = 0;
		reset();
        splash.classList.add('hidden');
        levelIsComplete = false;
        return;
	} else {
		if([8, 27, 37, 38, 39, 40, 66, 78].indexOf(ev.which) >= 0) {
			ev.preventDefault();
			if (moving)
				return;
		}
		switch(key) {
			case 8:
				if(levelObj['steps'].length > 1) {
					levelObj['steps'].pop();
					levelObj['startState'] = deepCopy(levelObj['steps'][levelObj['steps'].length - 1]);
					mapNeedsRedraw = true;
				}
				break;
			case 27:
				reset();
				playSound('select');
				break;
			case 37:
				playerMoveTo = LEFT;
				currentImage = 2;
				break;
			case 38:
				playerMoveTo = UP;
				currentImage = 1;
				break;
			case 39:
				playerMoveTo = RIGHT;
				currentImage = 3;
				break;
			case 40:
				playerMoveTo = DOWN;
				currentImage = 0;
				break;
			case 66:
				prev();
				playSound('select');
				break;
			case 78:
				next();
				playSound('select');
				break;
		}
	}
	if (playerMoveTo != null && !levelIsComplete) {
            var moved = makeMove(mapObj, gameStateObj, playerMoveTo);
            if (moved) {
            	if (!moving) {
                	levelObj['steps'].push(deepCopy(gameStateObj));
                }
                mapNeedsRedraw = true;
			}
            if (isLevelFinished(levelObj, gameStateObj)) {
                levelIsComplete = true;
                splash.classList.remove('hidden');
                playSound('applause');
			}
	}
	if (mapNeedsRedraw) {
		drawStage();
        mapNeedsRedraw = false;
	}
};

var reset = function() {
	levelObj = deepCopy(levels[currentLevelIndex]);
	mapObj = levelObj['mapObj'];
	currentImage = 0;
	info.querySelector('span').textContent = currentLevelIndex;
	drawMap();
	drawStage();
}

var prev = function() {
	currentLevelIndex = (currentLevelIndex - 1 < 0) ? levels.length - 1 : currentLevelIndex - 1;
	reset();
}

var next = function() {
	currentLevelIndex = (currentLevelIndex + 1 >= levels.length) ? 0 : currentLevelIndex + 1;
	reset();
}

var move = function(ev) {
	var clickx = ev.pageX ? Math.floor((ev.pageX - stage.offsetLeft)/TILEWIDTH) : ev.x;
	var clicky = ev.pageY ? Math.floor((ev.pageY - stage.offsetTop - 20)/TILEFLOORHEIGHT) : ev.y;
	var playerx = levelObj['startState']['player'][0];
	var playery = levelObj['startState']['player'][1];
	if (clickx == (playerx - 1) && clicky == playery)
		run(37);
	else if (clickx == playerx && clicky == (playery - 1) )
		run(38);
	else if (clickx == (playerx + 1) && clicky == playery)
		run(39);
	else if (clickx == playerx && clicky == (playery + 1) )
		run(40);
	else if(isBlocked(mapObj, levelObj['startState'], clickx, clicky) || mapObj[clickx][clicky] == ' ')
		return
	else {
		var graph = new Graph(makeGrid(mapObj));
		var start = graph.nodes[playerx][playery];
		var end = graph.nodes[clickx][clicky];
		var result = astar.search(graph.nodes, start, end);
		if (result.length > 0) {
			moving = true;
			result.forEach(function(element, index, array) {
				if(index == array.length - 1) {
					setTimeout(function() {
						moving = false;
						move(element);
					}, 100 * index);
				} else {
					setTimeout(move, 100 * index, element);
				}
			});
		}
	}
}

var info = document.getElementById('info');
var fullscreen = document.getElementById('fullscreen');
var title = document.getElementById('title');
var splash = document.getElementById('splash');
var control = document.getElementById('control');
var touch = document.getElementById('touch');
var data = document.getElementById('data');
var lines = data.innerHTML + '\n';
var levels = parser(lines.split(/\n/));
var levelObj, map, mapObj, moving = false;

if (window.Touch || 'ontouchstart' in window) {
	touch.classList.add('show');
} else {
	control.classList.add('show');
}

var hammer = new Hammer(document.documentElement);
document.ontouchmove = function(event) 
{
	if (event.touches.length == 1)
		event.preventDefault();   //Disables touch-scrolling AND pinch-to-zoom when called here.
}
hammer.onswipe = function(ev) {
	switch(ev.direction) {		
		case 'left':
			if (!moving) run(37);
			break;
		case 'up':
			if (!moving) run(38);
			break;
		case 'right':
			if (!moving) run(39);
			break;
		case 'down':
			if (!moving) run(40);
			break;
	}
};

if (mediaSupport('audio/ogg; codecs=vorbis', 'audio') ||
	mediaSupport('audio/mpeg', 'audio')) {
	var melody = document.getElementById('melody');
	var music = document.getElementById('music');
	melody.volume = 0.15;
	melody.muted = false;
	music.addEventListener('click', function() {
	  if(melody.muted) {
		melody.muted = false;
		music.classList.add('melody');
	  } else {
		melody.muted = true;
		music.classList.remove('melody');
	  }
	}, false);
	melody.addEventListener('ended', function() {
		melody.currentTime = 0;
		melody.pause();
		melody.play();
	}, false);
	music.classList.add('show');
	music.classList.add('melody');
	melody.play();
}

function start() {
	title.classList.remove('hidden');
	info.classList.remove('hidden');
	reset();
	document.addEventListener('keydown', run, false);
	title.addEventListener('click', run, false);
	splash.addEventListener('click', run, false);
	stage.addEventListener('click', function(ev) {if (!moving) move(ev);}, false);
	info.querySelector('span').addEventListener('click', function() { // Egg?
		if (confirm('Open Animation?')) {
			animation = true;
			drawCloud();
		} else {
			animation = false;
		}
	}, false);
	document.getElementById('reset').addEventListener('click', function() {if (!moving) run(27);}, false);
	document.getElementById('next').addEventListener('click', function() {if (!moving) run(78);}, false);
	document.getElementById('prev').addEventListener('click', function() {if (!moving) run(66);}, false);
	document.getElementById('undo').addEventListener('click', function() {if (!moving) run(8);}, false);
	if (typeof document.cancelFullScreen != 'undefined' ||
		typeof document.mozCancelFullScreen != 'undefined' ||
		typeof document.webkitCancelFullScreen != 'undefined') {
		fullscreen.addEventListener('click', toggleFullscreen, false);
		fullscreen.classList.add('show');
	}
	/*
	window.addEventListener('orientationchange', function() {
		alert(document.body.clientWidth+' & '+document.body.clientHeight+' & '+stage.clientWidth);
		}, false);
	*/
}

function playSound(filename) {
	var index = ['intro','select','match','applause'].indexOf(filename);
	var sound = document.querySelectorAll('audio.sound')[index];
	sound.play();
}

function mediaSupport(mimetype, container) {
	var elem = document.createElement(container);
	if(typeof elem.canPlayType == 'function'){
		var playable = elem.canPlayType(mimetype);
		if((playable.toLowerCase() == 'maybe')||(playable.toLowerCase() == 'probably')){
			return true;
		}
	}
	return false;
}

function hasItem (array, itemx, itemy) {
	return array.some(function(element, index, array) {
    	return element[0] == itemx && element[1] == itemy;
    });
}

function makeGrid(mapObj) {
	var grid = [];
	for (var x = 0; x < mapObj.length; x++) {
		grid.push([]);
	}			
	for (var x = 0; x < mapObj.length; x++)
		for (var y = 0; y < mapObj[0].length; y++) {
			if(isBlocked(mapObj, levelObj['startState'], x, y))
				grid[x].push(1);
			else
				grid[x].push(0);
		}
	return grid;
}

function deepCopy(p,c) {
	var c = c||{};
	for (var i in p) {
	  if (typeof p[i] === 'object') {
		c[i] = (p[i].constructor === Array)?[]:{};
		deepCopy(p[i],c[i]);
	  } else c[i] = p[i];}
	return c;
}

window.requestAnimFrame = (function(){
return window.requestAnimationFrame   || 
	window.webkitRequestAnimationFrame || 
	window.mozRequestAnimationFrame    || 
	window.oRequestAnimationFrame      || 
	window.msRequestAnimationFrame     || 
	function( callback ){
		window.setTimeout(callback, 1000 / 60);
	};
})();

function toggleFullscreen() {
if ((document.fullScreenElement && document.fullScreenElement !== null) ||
	(!document.mozFullScreen && !document.webkitIsFullScreen)) {
		enterFullscreen(document.documentElement);
	} else {
		cancelFullscreen();
	}
}

function enterFullscreen(docElm) {
	if (docElm.requestFullscreen) {
	    docElm.requestFullscreen();
	}
	else if (docElm.mozRequestFullScreen) {
	    docElm.mozRequestFullScreen();
	}
	else if (docElm.webkitRequestFullScreen) {
	    docElm.webkitRequestFullScreen();
	}
}

function cancelFullscreen() {
	if (document.exitFullscreen) {
	    document.exitFullscreen();
	}
	else if (document.mozCancelFullScreen) {
	    document.mozCancelFullScreen();
	}
	else if (document.webkitCancelFullScreen) {
	    document.webkitCancelFullScreen();
	}
}

