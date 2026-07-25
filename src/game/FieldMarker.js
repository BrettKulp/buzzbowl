export class FieldMarker {
    constructor(scene, x, y, height, color) {
        this.rect = scene.add.rectangle(x, y, 5, height, color);
        this.x = x;
    }

    updateX(x) {
        this.x = x;
        this.rect.x = x;
    }
}
