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

export function getAllPlayers(game) {
    return [...getHomePlayers(game), ...getAwayPlayers(game)];
}

export function deselectAllPlayers(game) {
    getAllPlayers(game).forEach(player => player.deselect());
}
