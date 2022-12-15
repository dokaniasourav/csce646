#version 300 es

#pragma vscode_glsllint_stage: frag

precision highp float;

uniform sampler2D u_image;
in vec2 v_texCord;
out vec4 outColor;

uniform int function_sel;

uniform int u_kernel_size;
uniform float intensity;
uniform float angle;
uniform float steep;

float SOME_FUNCTION_FOR_X = 1.0;
float SOME_FUNCTION_FOR_Y = 1.0;

float get_mag(vec2 xy_c) {
    return sqrt((xy_c.x * xy_c.x) + (xy_c.y * xy_c.y) + 0.00000000001);
}

vec2 function_xy(vec2 xy_input, int func_sel) {

    // Convert to -1, 1 range
    xy_input = xy_input *2.0 - vec2(1.0);

    float x = xy_input.x;
    float y = xy_input.y;

    // Get the vector length
    float FUNC_REP_XX = 1.0;
    float FUNC_REP_YY = 1.0;

    if (func_sel == 2) {
        FUNC_REP_XX = 0.0 + xy_input.x;
        FUNC_REP_YY = 0.0 + xy_input.y;
    } else if (func_sel == 3) {
        FUNC_REP_XX = 0.0 - xy_input.x;
        FUNC_REP_YY = 0.0 - xy_input.y;
    } else if (func_sel == 4) {
        FUNC_REP_XX = 0.0 - xy_input.y;
        FUNC_REP_YY = 0.0 + xy_input.x;
    } else if (func_sel == 5) {
        FUNC_REP_XX = 0.0 + xy_input.y;
        FUNC_REP_YY = 0.0 - xy_input.x;
    } else if (func_sel == 6) {
        FUNC_REP_XX = SOME_FUNCTION_FOR_X;
        FUNC_REP_YY = SOME_FUNCTION_FOR_Y;
    }

    vec2 out_val = vec2(FUNC_REP_XX, FUNC_REP_YY);
    out_val = out_val * vec2(cos(angle), sin(angle));
    float mag = get_mag(out_val);

    out_val = out_val/mag;
    return out_val;
}

vec2 transform_function(vec2 xy_c) {
    return function_xy(xy_c, function_sel);
}

vec3 line_integral() {
    vec2 onePixel = vec2(intensity) / vec2(textureSize(u_image, 0));
    vec4 colorSum = vec4(0.0);      // Initially zero -- 0.0, 0.0, 0.0, 0.0
    int length = u_kernel_size;

    vec2 currentPosition = vec2(v_texCord.xy);

    for(int i = 0; i < length; i++) {
        colorSum += texture(u_image, currentPosition);
        currentPosition = currentPosition + transform_function(currentPosition) * onePixel;
    }

    colorSum = vec4(colorSum.rgb/float(length), 1);
    return colorSum.rgb;
}

void main() {
    vec4 colorSum = vec4(0.0);      // Initially zero -- 0.0, 0.0, 0.0, 0.0
    colorSum = vec4(line_integral(), 1);
    outColor = vec4(colorSum.rgb, 1);
}