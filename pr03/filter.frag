#version 300 es

#pragma vscode_glsllint_stage: frag

precision highp float;

uniform sampler2D u_image;
in vec2 v_texCord;
out vec4 outColor;

//uniform float matrix_kernel[625];
uniform int matrix_size;

void main() {
    vec4 color = texture(u_image, v_texCord);
    vec2 indexCord = vec2(textureSize(u_image, 0)) * v_texCord;

    int matrix_size_2 = matrix_size*2;

    float sq = sqrt(
    (v_texCord.x * v_texCord.x) + (v_texCord.y * v_texCord.y) + 0.0000001);
//    float sq = 1.732;
    float xx = v_texCord.x/sq;
    float yy = v_texCord.y/sq;
    float ln_v = sqrt((xx*xx) + (yy*yy) + 0.000000001);

    float xc = float(int(indexCord.x)%matrix_size_2)/float(matrix_size_2);
    float yc = float(int(indexCord.y)%matrix_size_2)/float(matrix_size_2);
    float ln_c = sqrt((xc*xc) + (yc*yc) + 0.000000001);

    if (ln_c > ln_v) {
        outColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        float dot_p = (xx*xc + yy*yc)/ln_c * ln_v;
        dot_p = pow(dot_p, 1000.0);
        outColor = vec4(dot_p, dot_p, 0.0, 1.0);
    }

//    outColor = vec4(dither(color.rgb), 1);
}