// By default, the first board loaded by your page will be the same 
// each time you load (which is accomplished by "seeding" the random
// number generator. This makes testing (and grading!) easier!
Math.seedrandom(0);

// A short jQuery extension to read query parameters from the URL.
$.extend({
  getUrlVars: function() {
    var vars = [], pair;
    var pairs = window.location.search.substr(1).split('&');
    for (var i = 0; i < pairs.length; i++) {
      pair = pairs[i].split('=');
      vars.push(pair[0]);
      vars[pair[0]] = pair[1] &&
          decodeURIComponent(pair[1].replace(/\+/g, ' '));
    }
    return vars;
  },
  getUrlVar: function(name) {
    return $.getUrlVars()[name];
  }
});

// constants
var DEFAULT_BOARD_SIZE = 8;

var board;
var boardSize = 8;
var rules;
var $candyTable;
var crushing;

// initialize board
var boardSize = parseInt($.getUrlVar('size'));
if (!isNaN(boardSize) && boardSize >= 3 && boardSize <= 20) {
    board = new Board(boardSize);
} else {
    boardSize = DEFAULT_BOARD_SIZE;
    board = new Board(DEFAULT_BOARD_SIZE);
}
rules = new Rules(board);

$(document).ready(function() {
    // find the candy table
    $candyTable = $("#candy-table");

    // make the game
    rules.prepareNewGame();

    checkCrushOnceValid();
});

/* event handlers */ 

// new game
function newGame() {
    board.clear();
    rules.prepareNewGame();
    checkCrushOnceValid();
    clearArrow();
}

// show move
function showMove() {
    clearArrow();
    var move = rules.getRandomValidMove();
    if (move) {
        drawArrow(move.candy.row, move.candy.col, move.direction);
    } else {
        $(".new-game").addClass("highlight");
    }
}

/* mutators */

// check if the crush once is valid, and handle disable/enable
function checkCrushOnceValid() {
    if (rules.getCandyCrushes().length > 0) {
        crushing = true;
        crushOnce();
    } else {
        crushing = false;
    }
}

// crush once
function crushOnce() {
    clearArrow();
    setTimeout(function(){
        rules.removeCrushes(rules.getCandyCrushes());
        setTimeout(function(){
            rules.moveCandiesDown();
            checkCrushOnceValid();
        }, 500);
    }, 500);
}

// clears the arrow
function clearArrow() {
    var canvas = document.getElementById("candy-canvas");
    var ctxt = canvas.getContext("2d");
    ctxt.clearRect(0, 0, canvas.width, canvas.height);
}

// draws an arrow, index from 0
// TODO make the arrow prettier
function drawArrow(row, col, dir) {
    var canvas = document.getElementById("candy-canvas");
    var ctxt = canvas.getContext("2d");
    ctxt.fillStyle = '#2c3e50';

    var size = 320/boardSize;
    var pad = 0.2;
    var top = 0.8;
    var weight = 0.15;

    ctxt.save();
    ctxt.translate(size*col, size*row);
    
    if (dir == "right") {
        ctxt.translate(size/2, 0);
    } else if (dir == "left") {
        ctxt.translate(size, size);
        ctxt.translate(-size/2, 0);
        ctxt.rotate(Math.PI);
    } else if (dir == "up") {
        ctxt.translate(0, size/2);
        ctxt.rotate(3*Math.PI/2);
    } else {
        ctxt.translate(size, size);
        ctxt.translate(0, -size/2);
        ctxt.rotate(Math.PI/2);
    }

    ctxt.beginPath();
    ctxt.moveTo(size*pad, size*(0.5-weight));
    ctxt.lineTo(size*0.5, size*(0.5-weight));
    ctxt.lineTo(size*0.5, size*pad);
    ctxt.lineTo(size*(1-pad), size*0.5);
    ctxt.lineTo(size*0.5, size*(1-pad));
    ctxt.lineTo(size*0.5, size*(0.5+weight));
    ctxt.lineTo(size*pad, size*(0.5+weight));
    ctxt.closePath();
    ctxt.fill();

    ctxt.restore();
}

/* observers */

// turns a code into a location (code must have length 2 or 3)
function codeToLocation(code) {
    var y = code[0].charCodeAt(0) - 97;
    if (code.length == 2) {
        return [parseInt(code[1]) - 1, y];
    } else {
        return [parseInt(code.substr(1, 2)) - 1, y];
    }
}

// turns a location into a code
function locationToCode(row, col) {
    return (String.fromCharCode(col + 97)) + (row + 1);
}

// checks if a code is valid
function validCode(code) {
    if (code.length == 2 || code.length == 3) {
        var candyLocation = codeToLocation(code);
        if (candyLocation[0] >= 0 && candyLocation[1] >= 0 && board.isValidLocation(candyLocation[0] + 1, candyLocation[1] + 1)){
            return true;
        }
    }
    return false;
}

/* Event Handlers */
// access the candy object with info.candy

// add a candy to the board
$(board).on('add', function(e, info) {
    // console.log("add");
    var cellSize = 320/boardSize;
    var cellCode = locationToCode(info.candy.row, info.candy.col);
    var $cell = $(document.createElement('div'));
    $cell.attr("id", "candy-" + cellCode);
    $cell.attr("class", info.candy.color);
    $cell.css({height: cellSize, width: cellSize});
    $candyTable.append($cell);
    if (info.fromRow) {
        $cell.css({top: cellSize*info.fromRow, left: cellSize*info.fromCol});
        var animateInfo = {top: cellSize*info.toRow, left: cellSize*info.toCol};
        $cell.animate(animateInfo, 300, "swing", function() {
            $cell.attr("id", "candy-" + cellCode);
        });
    } else {
        $cell.css({top: cellSize*info.candy.row, left: cellSize*info.candy.col});
    }
    
});

// move a candy on the board
$(board).on('move', function(e, info) {
    // console.log("move", info);
    
    var cellCodeFrom = locationToCode(info.fromRow, info.fromCol);
    var cellCodeTo = locationToCode(info.toRow, info.toCol);
    var $cell = $("#candy-" + cellCodeFrom);
    $cell.unbind('click');

    var animateInfo;    
    if (info.candy == candyFrom) {
        candyFrom = null;
        animateInfo = {top: candyEndPos[1], left: candyEndPos[0]};

        $cell.animate(animateInfo, 300, "swing", function() {
            $cell.attr("id", "candy-" + cellCodeTo);
        });
    } else {
        if (info.fromRow < info.toRow) { // move down
            animateInfo = {top: $cell.position().top + 320/boardSize * (info.toRow-info.fromRow)};
        } else if (info.fromRow > info.toRow) { // move up
            animateInfo = {top: $cell.position().top - 320/boardSize * (info.fromRow-info.toRow)};
        } else if (info.fromCol < info.toCol) { // move right
            animateInfo = {left: $cell.position().left + 320/boardSize * (info.toCol-info.fromCol)};
        } else { // move left
            animateInfo = {left: $cell.position().left - 320/boardSize * (info.fromCol-info.toCol)};
        }

        $cell.animate(animateInfo, 300, "swing", function() {
            $cell.attr("id", "candy-" + cellCodeTo);
        });
    }
    checkCrushOnceValid();
});

// remove a candy from the board
$(board).on('remove', function(e, info) {
    // console.log("remove");
    var cellCode = locationToCode(info.fromRow, info.fromCol);
    var $cell = $("#candy-" + cellCode);
    $cell.attr("id", "");
    $cell.fadeOut(150, "swing", function() {
        $cell.remove();
    });
});

// move a candy on the board
$(board).on('scoreUpdate', function(e, info) {
    $scoreNum = $("#score-num");
    $scoreNum.removeClass();
    if (info.candy) {
        $scoreNum.addClass(info.candy.color);
    }
    $scoreNum.text(info.score);
});

/* Candy Dragging */
var $candyDrag;
var candyDragPos;
var candyEndPos;
var candyDragCode;
var candyDragMode = false;
var candyDragStart = [0, 0];
var candyFrom;

$(document).on('mousedown', "html", function(evt) {
    $candyDrag = $("#candy-"+ coordToCode(evt.clientX, evt.clientY));
    if ($candyDrag.length > 0) {
        candyDragPos = [$candyDrag.position().left, $candyDrag.position().top];
        candyDragStart = [evt.clientX, evt.clientY];
        candyDragMode = true;
        candyDragCode = coordToCode(evt.clientX, evt.clientY);
        candyFrom = board.getCandyAt(codeToLocation(candyDragCode)[0], codeToLocation(candyDragCode)[1]);
    }
});

$(document).on('mousemove', "html", function(evt) {
    if (candyDragMode) {
        // console.log(candyDragPos);
        // console.log($candyDrag.css('left'), $candyDrag.css('top'));
        $candyDrag.css('left', candyDragPos[0] + evt.clientX - candyDragStart[0]);
        $candyDrag.css('top', candyDragPos[1] + evt.clientY - candyDragStart[1]);
    }
});

$(document).on('mouseup', "html", function(evt) {
    if (candyDragMode) {
        // console.log(candyDragStart);
        candyDragMode = false;
        var candyEndCode = coordToCode(evt.clientX, evt.clientY);
        var $candyEnd = $("#candy-"+ candyEndCode);
        
        // if move type is valid
        var dir = getDirection(candyDragCode, candyEndCode);
        if ($candyEnd.length > 0 && dir != "" && rules.isMoveTypeValid(candyFrom, dir)) {
            var candyTo = board.getCandyAt(codeToLocation(candyEndCode)[0], codeToLocation(candyEndCode)[1]);
            candyEndPos = [$candyEnd.position().left, $candyEnd.position().top];
            board.flipCandies(candyFrom, candyTo);
            clearArrow();
        } else {
            $candyDrag.css('left', candyDragPos[0]);
            $candyDrag.css('top', candyDragPos[1]);
        }
    }
});

// get direction, either "up", "down", "left", "right", or ""
function getDirection(startCode, endCode) {
    if (startCode == null || endCode == null) return "";
    var startLoc = codeToLocation(startCode);
    var endLoc = codeToLocation(endCode);
    if (startLoc[0] == endLoc[0]) {
        if (startLoc[1] + 1 == endLoc[1]) {
            return "right";
        } else if (startLoc[1] - 1 == endLoc[1]) {
            return "left";
        }
    } else if (startLoc[1] == endLoc[1]) {
        if (startLoc[0] + 1 == endLoc[0]) {
            return "down";
        } else if (startLoc[0] - 1 == endLoc[0]) {
            return "up";
        }
    }
    return "";
}

// returns jquery candy object if exists, otherwise null
function coordToCode(x, y) {
    var cellSize = 320/boardSize;
    var candyTableLeft = $candyTable.offset().left;
    var candyTableTop = $candyTable.offset().top;
    if (!(x < candyTableLeft || x > candyTableLeft + 320 || y < candyTableTop || y > candyTableTop + 320)) {
        return locationToCode(Math.floor((y - candyTableTop)/cellSize), Math.floor((x - candyTableLeft)/cellSize));
    }
}

// Button Events
$(document).on('click', "#buttonIDhere", function(evt) {
  // Your code here.
});

// keyboard events arrive here
$(document).on('keydown', function(evt) {
  // Your code here.
});