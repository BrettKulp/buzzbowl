export class EndZone {
    constructor(scene, x, y, width, height, options = {}) {
        const {
            fillColor,
            fillAlpha,
            stroke = false,
            name = "EndZone",
            type = "EndZone",
            isStatic = false
        } = options;

        this.rect = fillColor !== undefined
            ? scene.add.rectangle(x, y, width, height, fillColor, fillAlpha)
            : scene.add.rectangle(x, y, width, height);

        if (fillColor === undefined) {
            this.rect.setFillStyle(undefined, 0);
        }

        if (stroke) {
            this.rect.setStrokeStyle();
        }

        this.rect.name = name;
        this.rect.entityType = type;

        scene.matter.add.gameObject(this.rect, { isStatic, isSensor: true });
    }
}
