var canvas, ctx;
var solver;



const INPUT = {
  painting: false,
  brush: 0,
  oldMouseCords: { x: null, y: null }
}

const BRUSH = {
  WALL: 0,
  EMPTY: 1,
  START: 2,
  END: 3
}

const COLORS = {
  GRID_LINE: "#7d7d7d",
  WALL: "#ababab",
  EMPTY: "black",
  START_NODE: "green",
  END_NODE: "red",
  MARKED: "#00698f",
  PATH: "yellow"
}

const WALL = true, EMPTY = false;

const SETTINGS = {
  size: 30,
  algorythm: 'A*',
  diagonal: true,
  speed: 26,
  heuristics: 'NONE',
  paused: false,
  weighting: 'HOMOGENIC'
}

const GRID = {
  cells: [],//false = empty, true = wall
  cell_size: 30,
  width: 20,
  height: 25,
  offset_x: 10,
  offset_y: 10,
  startCell: { x: 0, y: 0 },
  endCell: { x: 10, y: 2 },
  id: (x, y) => x + y * GRID.width
}

function drawGrid() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = COLORS.GRID_LINE;
  for (var x = 1; x < GRID.width; x++) {
    ctx.beginPath();
    ctx.moveTo(GRID.offset_x + (1 + GRID.cell_size) * x, 0);
    ctx.lineTo(GRID.offset_x + (1 + GRID.cell_size) * x, canvas.height);
    ctx.stroke();
  }
  for (var y = 1; y < GRID.height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, GRID.offset_y + (1 + GRID.cell_size) * y);
    ctx.lineTo(canvas.width, GRID.offset_y + (1 + GRID.cell_size) * y);
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.START_NODE;
  drawCell(GRID.startCell.x, GRID.startCell.y);
  ctx.fillStyle = COLORS.END_NODE;
  drawCell(GRID.endCell.x, GRID.endCell.y);
}

function drawCell(cx, cy) {
  let x = GRID.offset_x + cx * (GRID.cell_size + 1);
  let y = GRID.offset_y + cy * (GRID.cell_size + 1);
  let w = GRID.cell_size;
  let h = GRID.cell_size;
  if (cx == 0) {
    w += GRID.offset_x;
    x -= GRID.offset_x;
  } else if (cx == GRID.width - 1) {
    w += GRID.offset_x + 2;
  }
  if (cy == 0) {
    h += GRID.offset_y;
    y -= GRID.offset_y;
  } else if (cy == GRID.height - 1) {
    h += GRID.offset_y + 2;
  }
  //ctx.fillStyle = "white";
  ctx.fillRect(x + 1, y + 1, w - 1, h - 1);
}

function drawWalls() {
  ctx.fillStyle = COLORS.WALL;
  for (var x = 0; x < GRID.width; x++) {
    for (var y = 0; y < GRID.height; y++) {
      let id = x + y * GRID.width;
      if (GRID.cells[id] == WALL)
        drawCell(x, y);
    }
  }
}

function lineCords(x0, y0, x1, y1) {
  var arr = new Array();

  if (Math.abs(x0 - x1) > Math.abs(y0 - y1)) {
    var step = (y1 - y0) / (x1 - x0);
    for (let x = x0; x <= x1; x++) {
      let y = y0 + Math.round((x - x0) * step);
      arr.push(x, y);
    }
  } else {
    var step = (x1 - x0) / (y1 - y0);
    for (let y = y0; y <= y1; y++) {
      let x = x0 + Math.round((y - y0) * step);
      arr.push(x, y);
    }
  }

  return arr;
}

function updateGridDimensions() {
  GRID.cell_size = SETTINGS.size;
  GRID.width = Math.floor((canvas.width - 1) / (GRID.cell_size + 1));
  GRID.height = Math.floor((canvas.height - 1) / (GRID.cell_size + 1));
  GRID.offset_x = Math.floor((canvas.width - (GRID.cell_size + 1) * GRID.width) / 2);
  GRID.offset_y = Math.floor((canvas.height - (GRID.cell_size + 1) * GRID.height) / 2);
  GRID.cells = new Array(GRID.width * GRID.height).fill(EMPTY);
  GRID.startCell = { x: Math.round(GRID.width * 0.3333), y: Math.round(GRID.height / 2) };
  GRID.endCell = { x: Math.round(GRID.width * 0.6666), y: Math.round(GRID.height / 2) };
}

function changeSettings(param, val) {
  switch (param) {
    case 'SIZE':
      SETTINGS.size = parseInt(val);
      updateGridDimensions();
      resetButton();
      break;
    case 'ALGORYTHM':
      SETTINGS.algorythm = val;
      if (val == 'DFS') document.getElementById('heuristicsDiv').style.display = 'none';
      else document.getElementById('heuristicsDiv').style.display = 'block';
      break;
    case 'HEURISTICS':
      SETTINGS.heuristics = val;
      break;
    case 'SPEED':
      SETTINGS.speed = parseInt(val);
      break;
    case 'WEIGHTING':
      SETTINGS.weighting = val;
      console.log(SETTINGS.weighting);
      break;
  }
}

function mouseCordsToCellCords(mx, my) {
  let cx = Math.floor((mx - GRID.offset_x) / (GRID.cell_size + 1));
  cx = Math.min(cx, GRID.width - 1);
  cx = Math.max(cx, 0);
  let cy = Math.floor((my - GRID.offset_y) / (GRID.cell_size + 1));
  cy = Math.min(cy, GRID.height - 1);
  cy = Math.max(cy, 0);
  return { x: cx, y: cy }
}

function pageLoaded() {
  canvas = document.getElementById('canvas1');

  canvas.addEventListener('mousedown', e => {
    if (solver != null) return;
    INPUT.painting = true;

    let cords = mouseCordsToCellCords(e.offsetX, e.offsetY);
    INPUT.oldMouseCords = { x: cords.x, y: cords.y };

    if (cords.x == GRID.startCell.x && cords.y == GRID.startCell.y) {
      INPUT.brush = BRUSH.START;
    } else if (cords.x == GRID.endCell.x && cords.y == GRID.endCell.y) {
      INPUT.brush = BRUSH.END;
    } else {
      if (e.button == 0) {
        ctx.fillStyle = COLORS.WALL;
        INPUT.brush = BRUSH.WALL;
      }
      else if (e.button == 2) {
        ctx.fillStyle = COLORS.EMPTY;
        INPUT.brush = BRUSH.EMPTY;
      }
      let id = cords.x + cords.y * GRID.width;
      GRID.cells[id] = INPUT.brush == BRUSH.WALL ? WALL : EMPTY;
      drawCell(cords.x, cords.y);
    }
  });

  canvas.addEventListener('mousemove', e => {
    if (!INPUT.painting) return;
    let cords = mouseCordsToCellCords(e.offsetX, e.offsetY);

    if (INPUT.brush == BRUSH.START) {
      if (cords.x == GRID.endCell.x && cords.y == GRID.endCell.y) return;
      let id = cords.x + cords.y * GRID.width;
      if (GRID.cells[id] == WALL) return;
      let oldId = GRID.startCell.x + GRID.startCell.y * GRID.width;
      ctx.fillStyle = GRID.cells[oldId] == WALL ? COLORS.WALL : COLORS.EMPTY;
      drawCell(GRID.startCell.x, GRID.startCell.y);
      ctx.fillStyle = COLORS.START_NODE;
      drawCell(cords.x, cords.y);
      GRID.startCell.x = cords.x;
      GRID.startCell.y = cords.y;
      return;
    } else if (INPUT.brush == BRUSH.END) {
      if (cords.x == GRID.startCell.x && cords.y == GRID.startCell.y) return;
      let id = cords.x + cords.y * GRID.width;
      if (GRID.cells[id] == WALL) return;
      let oldId = GRID.endCell.x + GRID.endCell.y * GRID.width;
      ctx.fillStyle = GRID.cells[oldId] == WALL ? COLORS.WALL : COLORS.EMPTY;
      drawCell(GRID.endCell.x, GRID.endCell.y);
      ctx.fillStyle = COLORS.END_NODE;
      drawCell(cords.x, cords.y);
      GRID.endCell.x = cords.x;
      GRID.endCell.y = cords.y;
      return;
    }

    if (cords.x == GRID.startCell.x && cords.y == GRID.startCell.y) return;
    else if (cords.x == GRID.endCell.x && cords.y == GRID.endCell.y) return;

    let id = cords.x + cords.y * GRID.width;
    GRID.cells[id] = INPUT.brush == BRUSH.WALL ? WALL : EMPTY;

    drawCell(cords.x, cords.y);
    INPUT.oldMouseCords = { x: cords.x, y: cords.y };
  });

  canvas.addEventListener('mouseup', e => {
    INPUT.painting = false;
  });
  canvas.addEventListener('mouseleave', e => {
    INPUT.painting = false;
  });


  canvas.height = canvas.getBoundingClientRect().height;
  canvas.width = canvas.getBoundingClientRect().width;
  ctx = canvas.getContext('2d');
  updateGridDimensions();
  GRID.startCell = { x: Math.round(GRID.width * 0.3333), y: Math.round(GRID.height / 2) };
  GRID.endCell = { x: Math.round(GRID.width * 0.6666), y: Math.round(GRID.height / 2) };
  drawGrid();
  INPUT.painting = false;


  window.requestAnimationFrame(frame);
}

function frame() {
  if (solver != null && !solver.finished && !SETTINGS.paused) {
    solver.update();
  }
  window.requestAnimationFrame(frame);
}

const DijkstraSolverOriginal = function () {

  this.neighbours = function (c) {
    var arr = [];

    if (c >= GRID.width && !this.visitedArr[c - GRID.width] && GRID.cells[c - GRID.width] != WALL) {
      arr.push(c - GRID.width);
    }
    if (c < GRID.width * (GRID.height - 1) && !this.visitedArr[c + GRID.width] && GRID.cells[c + GRID.width] != WALL) {
      arr.push(c + GRID.width);
    }
    if (c % GRID.width != GRID.width - 1 && !this.visitedArr[c + 1] && GRID.cells[c + 1] != WALL) {
      arr.push(c + 1);
    }
    if (c % GRID.width != 0 && !this.visitedArr[c - 1] && GRID.cells[c - 1] != WALL) {
      arr.push(c - 1);
    }

    if (arr.length > 0) return arr;
    else return null;
  }

  this.heuristics = function (c1, c2) {
    if (SETTINGS.heuristics == 'NONE') return 1;

    let c1x = c1 % GRID.width;
    let c1y = (c1 - c1x) / GRID.width;
    let c2x = c2 % GRID.width;
    let c2y = (c2 - c2x) / GRID.width;

    switch (SETTINGS.heuristics) {
      case 'EUKLIDES': return Math.sqrt((c1x - c2x) * (c1x - c2x) + (c1y - c2y) * (c1y - c2y));
      case 'MANHATTAN': return Math.abs(c1x - c2x) + Math.abs(c1y - c2y);
      case 'CHEBYSHEW': return Math.max(Math.abs(c1x - c2x), Math.abs(c1y - c2y));
      case 'OCTILE': return Math.max(Math.abs(c1x - c2x), Math.abs(c1y - c2y) + 1.414 * Math.min(Math.abs(c1x - c2x), Math.abs(c1y - c2y)));
    }
  }

  this.cellWeight = function (c) {
    if (SETTINGS.weighting == 'HOMOGENIC') return 1;
    if (SETTINGS.weighting == 'RANDOM') return Math.random();

    if (c >= GRID.width && GRID.cells[c - GRID.width] == WALL)
      return 10;

    if (c < GRID.width * (GRID.height - 1) && GRID.cells[c + GRID.width] == WALL)
      return 10;

    if (c % GRID.width != GRID.width - 1 && GRID.cells[c + 1] == WALL)
      return 10;

    if (c % GRID.width != 0 && GRID.cells[c - 1] == WALL)
      return 10;


    return 1;
  }

  this.pickCell = function () {
    var cost = Infinity;
    var index = undefined;

    let endCell = GRID.id(GRID.endCell.x, GRID.endCell.y);

    for (let i = 0; i < this.queue.length; i++) {
      if (this.costArr[this.queue[i]] + this.heuristics(this.queue[i], endCell) < cost) {
        cost = this.costArr[this.queue[i]] + this.heuristics(this.queue[i], endCell);
        index = i;
      }
    }

    let cell = this.queue[index];
    this.queue.splice(index, 1);
    return cell;
  }

  this.init = function () {
    this.finished = false;
    this.costArr = new Array(GRID.width * GRID.height).fill(Infinity);
    this.previousArr = new Array(GRID.width * GRID.height).fill(undefined);
    this.visitedArr = new Array(GRID.width * GRID.height).fill(false);

    let startCell = GRID.id(GRID.startCell.x, GRID.startCell.y);
    this.costArr[startCell] = 0;
    this.queue = [startCell];
    ctx.fillStyle = COLORS.MARKED;
  }

  this.drawPath = function () {
    ctx.fillStyle = COLORS.PATH;
    let cell = this.previousArr[GRID.id(GRID.endCell.x, GRID.endCell.y)];
    while (this.previousArr[cell] != undefined) {
      let cx = cell % GRID.width;
      let cy = (cell - cx) / GRID.width;
      if (!(cx == GRID.startCell.x && cy == GRID.startCell.y))
        drawCell(cx, cy);

      cell = this.previousArr[cell];
    }
  }

  this.update = function () {
    for (let f = 0; f < SETTINGS.speed; f++) {

      if (this.queue.length > 0) {
        var cell = this.pickCell();

        if (this.visitedArr[cell] == true || GRID.cells[cell] == WALL) {
          f--;
          continue;
        }

        let cx = cell % GRID.width;
        let cy = (cell - cx) / GRID.width;
        if (!(cx == GRID.startCell.x && cy == GRID.startCell.y))
          drawCell(cx, cy);

        this.visitedArr[cell] = true;

        var cell_n = this.neighbours(cell);
        if (cell_n != null) {
          for (let i = 0; i < cell_n.length; i++) {

            var cell_weight = this.cellWeight(cell_n[i]);

            if (this.costArr[cell] + cell_weight < this.costArr[cell_n[i]]) {
              this.costArr[cell_n[i]] = this.costArr[cell] + cell_weight;
              this.previousArr[cell_n[i]] = cell;
              if (cell_n[i] == GRID.id(GRID.endCell.x, GRID.endCell.y)) {
                this.drawPath();
                this.finished = true;
                document.getElementById('runButton').innerHTML = "CLEAR";
                return;
              }
            }
            this.queue.push(cell_n[i]);
          }
        }
      }
      else {
        this.finished = true;
        document.getElementById('runButton').innerHTML = "CLEAR";
        return;
      }

    }

  }

}

const DijkstraSolver = function () {

  this.neighbours = function (c) {
    var arr = [];

    if (c >= GRID.width && this.visitedArr[c - GRID.width] != this.turn && GRID.cells[c - GRID.width] != WALL) {
      arr.push(c - GRID.width);
    }
    if (c < GRID.width * (GRID.height - 1) && this.visitedArr[c + GRID.width] != this.turn && GRID.cells[c + GRID.width] != WALL) {
      arr.push(c + GRID.width);
    }
    if (c % GRID.width != GRID.width - 1 && this.visitedArr[c + 1] != this.turn && GRID.cells[c + 1] != WALL) {
      arr.push(c + 1);
    }
    if (c % GRID.width != 0 && this.visitedArr[c - 1] != this.turn && GRID.cells[c - 1] != WALL) {
      arr.push(c - 1);
    }

    if (arr.length > 0) return arr;
    else return null;
  }

  this.heuristics = function (c1, c2) {
    if (SETTINGS.heuristics == 'NONE') return 1;

    let c1x = c1 % GRID.width;
    let c1y = (c1 - c1x) / GRID.width;
    let c2x = c2 % GRID.width;
    let c2y = (c2 - c2x) / GRID.width;

    switch (SETTINGS.heuristics) {
      case 'EUKLIDES': return Math.sqrt((c1x - c2x) * (c1x - c2x) + (c1y - c2y) * (c1y - c2y));
      case 'MANHATTAN': return Math.abs(c1x - c2x) + Math.abs(c1y - c2y);
      case 'CHEBYSHEW': return Math.max(Math.abs(c1x - c2x), Math.abs(c1y - c2y));
      case 'OCTILE': return Math.max(Math.abs(c1x - c2x), Math.abs(c1y - c2y) + 1.414 * Math.min(Math.abs(c1x - c2x), Math.abs(c1y - c2y)));
    }
  }

  this.cellWeight = function (c) {
    if (SETTINGS.weighting == 'HOMOGENIC') return 1;
    if (SETTINGS.weighting == 'RANDOM') return Math.random();

    if (c >= GRID.width && GRID.cells[c - GRID.width] == WALL)
      return 10;

    if (c < GRID.width * (GRID.height - 1) && GRID.cells[c + GRID.width] == WALL)
      return 10;

    if (c % GRID.width != GRID.width - 1 && GRID.cells[c + 1] == WALL)
      return 10;

    if (c % GRID.width != 0 && GRID.cells[c - 1] == WALL)
      return 10;


    return 1;
  }

  this.pickCell = function () {
    var cost = Infinity;
    var index = undefined;


    let goalCell = this.turn ? GRID.id(GRID.endCell.x, GRID.endCell.y) : GRID.id(GRID.startCell.x, GRID.startCell.y);

    if (this.turn) {
      for (let i = 0; i < this.queueStart.length; i++) {
        if (this.costArr[this.queueStart[i]] + this.heuristics(this.queueStart[i], goalCell) < cost) {
          cost = this.costArr[this.queueStart[i]] + this.heuristics(this.queueStart[i], goalCell);
          index = i;
        }
      }
      let cell = this.queueStart[index];
      this.queueStart.splice(index, 1);
      return cell;
    }
    else {
      for (let i = 0; i < this.queueEnd.length; i++) {
        if (this.costArr[this.queueEnd[i]] + this.heuristics(this.queueEnd[i], goalCell) < cost) {
          cost = this.costArr[this.queueEnd[i]] + this.heuristics(this.queueEnd[i], goalCell);
          index = i;
        }
      }
      let cell = this.queueEnd[index];
      this.queueEnd.splice(index, 1);
      return cell;
    }
  }

  this.init = function () {
    this.finished = false;
    this.costArr = new Array(GRID.width * GRID.height).fill(Infinity);
    this.previousArr = new Array(GRID.width * GRID.height).fill(undefined);
    this.visitedArr = new Array(GRID.width * GRID.height).fill(null);//null - unvisited, true - visitedStart, false - visited End

    let startCell = GRID.id(GRID.startCell.x, GRID.startCell.y);
    this.costArr[startCell] = 0;
    this.queueStart = [startCell];

    let endCell = GRID.id(GRID.endCell.x, GRID.endCell.y);
    this.costArr[endCell] = 0;
    this.queueEnd = [endCell]
    ctx.fillStyle = COLORS.MARKED;

    this.turn = true;//true - start, false - end
  }

  this.drawPath = function (connectionCell) {
    ctx.fillStyle = COLORS.PATH;

    var cell = connectionCell;
    while (this.previousArr[cell] != undefined) {
      let cx = cell % GRID.width;
      let cy = (cell - cx) / GRID.width;
      if (!(cx == GRID.startCell.x && cy == GRID.startCell.y))
        drawCell(cx, cy);

      cell = this.previousArr[cell];
    }
  }

  this.update = function () {
    for (let f = 0; f < SETTINGS.speed; f++) {
    
      if(this.turn){

      if (this.queueStart.length > 0) {
        var cell = this.pickCell();

        if (this.visitedArr[cell] == this.turn || GRID.cells[cell] == WALL) {
          f--;
          continue;
        }
        /*if(this.visitedArr[cell] == !this.turn){
          this.drawPath(cell);
          this.finished = true;
          document.getElementById('runButton').innerHTML = "CLEAR";
          return;
        }*/

        let cx = cell % GRID.width;
        let cy = (cell - cx) / GRID.width;
        if (!(cx == GRID.startCell.x && cy == GRID.startCell.y))
          drawCell(cx, cy);

        this.visitedArr[cell] = this.turn;

        var cell_n = this.neighbours(cell);
        if (cell_n != null) {
          for (let i = 0; i < cell_n.length; i++) {

            var cell_weight = this.cellWeight(cell_n[i]);

            if (this.costArr[cell] + cell_weight < this.costArr[cell_n[i]]) {
              this.costArr[cell_n[i]] = this.costArr[cell] + cell_weight;
              this.previousArr[cell_n[i]] = cell;
            }
            this.queueStart.push(cell_n[i]);
          }
        }
      }
      else {
        console.log(4);
        this.finished = true;
        document.getElementById('runButton').innerHTML = "CLEAR";
        continue;
      }

      }else{
        if (this.queueEnd.length > 0) {
          var cell = this.pickCell();
  
          if (this.visitedArr[cell] == this.turn || GRID.cells[cell] == WALL) {
            f--;
            continue;
          }

          /*if(this.visitedArr[cell] == !this.turn){
            this.drawPath(cell);
            this.finished = true;
            document.getElementById('runButton').innerHTML = "CLEAR";
            return;
          }*/
  
          let cx = cell % GRID.width;
          let cy = (cell - cx) / GRID.width;
          if (!(cx == GRID.startCell.x && cy == GRID.startCell.y))
            drawCell(cx, cy);
  
          this.visitedArr[cell] = this.turn;
  
          var cell_n = this.neighbours(cell);
          if (cell_n != null) {
            for (let i = 0; i < cell_n.length; i++) {
  
              var cell_weight = this.cellWeight(cell_n[i]);
  
              if (this.costArr[cell] + cell_weight < this.costArr[cell_n[i]]) {
                this.costArr[cell_n[i]] = this.costArr[cell] + cell_weight;
                this.previousArr[cell_n[i]] = cell;
                console.log(this.turn, this.visitedArr[cell_n[i]]);
              }
              this.queueEnd.push(cell_n[i]);
            }
          }
        }
        else {
          console.log(4);
          this.finished = true;
          document.getElementById('runButton').innerHTML = "CLEAR";
          continue;
        }
      }

      this.turn = !this.turn;
    }

  }

}

function runButton(state) {
  var button = document.getElementById('runButton');

  switch (button.innerHTML) {
    case 'RUN':
      solver = new DijkstraSolver();
      solver.init();
      button.innerHTML = 'PAUSE';
      break;
    case 'PAUSE':
      SETTINGS.paused = true;
      button.innerHTML = 'RESUME';
      break;
    case 'RESUME':
      SETTINGS.paused = false;
      button.innerHTML = 'PAUSE';
      break;
    case 'CLEAR':
      drawGrid();
      drawWalls();
      solver = null;
      button.innerHTML = 'RUN'; break;
  }
}

function resetButton() {
  GRID.cells = new Array(GRID.width * GRID.height).fill(EMPTY);
  GRID.startCell = { x: Math.round(GRID.width * 0.3333), y: Math.round(GRID.height / 2) }
  GRID.endCell = { x: Math.round(GRID.width * 0.6666), y: Math.round(GRID.height / 2) }
  drawGrid();
  solver = null;
  document.getElementById('runButton').innerHTML = "RUN";
}
