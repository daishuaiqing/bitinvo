(function () {
  var blockContextMenu, body;

  blockContextMenu = function (evt) {
    evt.preventDefault();
  };

  body = document.querySelector('body');
  body.addEventListener('contextmenu', blockContextMenu);
})();