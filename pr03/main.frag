#version 300 es

#pragma vscode_glsllint_stage: frag

precision highp float;

uniform sampler2D u_image;
in vec2 v_texCord;
out vec4 outColor;

uniform int u_kernel_size;
uniform float intensity;

vec2 function_xy(vec2 xy_c) {
    float ln = sqrt((xy_c.x * xy_c.x) + (xy_c.y * xy_c.y) + 0.000000001);
    float xx = xy_c.x / ln;
    float yy = xy_c.y / ln;
    return vec2(xx, yy);
}

vec2 function_circle(vec2 xy_c) {
    float ln = sqrt((xy_c.x * xy_c.x) + (xy_c.y * xy_c.y) + 0.000000001);
    float xx = -xy_c.y / ln;
    float yy =  xy_c.x / ln;
    return vec2(xx, yy);
}

vec3 line_integral() {
    vec2 onePixel = vec2(intensity) / vec2(textureSize(u_image, 0));
    vec4 colorSum = vec4(0.0);      // Initially zero -- 0.0, 0.0, 0.0, 0.0
    int length = u_kernel_size;

    vec2 currentPosition = vec2(v_texCord.xy);

    for(int i = 0; i < length; i++) {
        colorSum += texture(u_image, currentPosition);
        currentPosition = currentPosition + function_circle(currentPosition) * onePixel;
    }

    colorSum = vec4(colorSum.rgb/float(length), 1);
    return colorSum.rgb;
}

void main() {
    vec4 colorSum = vec4(0.0);      // Initially zero -- 0.0, 0.0, 0.0, 0.0
    colorSum = vec4(line_integral(), 1);
    outColor = vec4(colorSum.rgb, 1);
}