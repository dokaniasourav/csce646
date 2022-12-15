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

void main() {
    vec4 color = texture(u_image, v_texCord);
    vec2 indexCord = vec2(textureSize(u_image, 0)) * v_texCord + vec2(steep/1.08, steep/1.08);

    int matrix_size_2 = int((sqrt(float(u_kernel_size))*15.0 + 35.0));

    vec2 xy_out = transform_function(v_texCord.xy);
    float ln_v = get_mag(xy_out);

    float xc = float(int(indexCord.x)%matrix_size_2)/float(matrix_size_2);
    float yc = float(int(indexCord.y)%matrix_size_2)/float(matrix_size_2);
    vec2 xy_cc = vec2(xc, yc);
    xy_cc = xy_cc * 2.0 - vec2(1.0);
    float ln_c = get_mag(xy_cc);

//    if (xc > 0.98 || yc > 0.98) {
//        float dot_p = 1.0;
//        outColor = vec4(dot_p, dot_p, dot_p, 1.0);
//    }
//    else {
//        outColor = vec4(1.0, 0.0, 0.0, 1.0);
//    }
    float dot_p = ((xy_out.x * xy_cc.x) + (xy_out.y * xy_cc.y)) / pow(ln_c, 1.0001 + intensity / 1000.0);
    dot_p = dot_p + 0.0000001;
    dot_p = pow(dot_p, 1111.0 / sqrt(intensity));
    outColor = vec4(dot_p, dot_p, dot_p, 1.0);
//    }

//    outColor = vec4(dither(color.rgb), 1);
}