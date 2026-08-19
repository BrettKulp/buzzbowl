export function yardsToPixels(yards) {
    return yards * 13.2;
}

export function pixelsToYards(pixels) {
    return Math.round(pixels / 13.2);
}

export function getHomePlayers(game) {
    return game.home.children ? game.home.children.entries : [];
}

export function getAwayPlayers(game) {
    return game.away.children ? game.away.children.entries : [];
}

export function getOffensivePlayers(game) {
    return game.possession === "Home" ? getHomePlayers(game) : getAwayPlayers(game);
}

export function getDefensivePlayers(game) {
    return game.possession === "Home" ? getAwayPlayers(game) : getHomePlayers(game);
}

export function getAllPlayers(game) {
    return [...getHomePlayers(game), ...getAwayPlayers(game)];
}

export function getBallCarrier(game) {
    let carrier = getOffensivePlayers(game).find(player => player.hasBall === true);
    return carrier; 
}

export function getBallCarrierX(game) {
   return getBallCarrier(game)?.x;
}

export function deselectAllPlayers(game) {
    getAllPlayers(game).forEach(player => player.deselect());
}
