const admin = require('firebase-admin');
const fs    = require('fs');
const path  = require('path');

const ROOT         = path.resolve(__dirname, '..');
const SA_PATH      = path.join(ROOT, 'serviceAccountKey.json');
const PROBLEMS_FILE = path.join(ROOT, 'data', 'codearena_problems.json');

const tensorTonicProblems = [
  {
    id: "tt_1",
    source: "tensortonic",
    leetcodeId: 3001,
    number: 3001,
    title: "Sigmoid Activation",
    slug: "sigmoid-activation",
    difficulty: "Easy",
    topics: ["Machine Learning", "Math"],
    companyTags: ["Google", "Meta", "OpenAI"],
    type: "coding",
    description: "Implement the sigmoid activation function:\n\n$$\\sigma(x) = \\frac{1}{1 + e^{-x}}$$\n\nYour function should accept a list of float values and return a list containing the sigmoid of each value.\n\n### Input Format\nA single line containing space-separated float values.\n\n### Output Format\nA single line containing space-separated sigmoid values rounded to 4 decimal places.",
    hints: [
      "Use math.exp(-x) to calculate the exponential part.",
      "Be careful to return a float for each element."
    ],
    examples: [
      {
        input: "0.0 2.0 -2.0 10.0 -10.0",
        output: "0.5000 0.8808 0.1192 1.0000 0.0000",
        explanation: "Sigmoid of 0 is 0.5. Sigmoid of 2 is ~0.8808. Sigmoid of -2 is ~0.1192."
      }
    ],
    constraints: [
      "The input list contains between 1 and 1000 float values.",
      "Each float value is between -100.0 and 100.0."
    ],
    sampleTestCase: "0.0 2.0 -2.0 10.0 -10.0",
    exampleTestcases: "0.0 2.0 -2.0 10.0 -10.0\n-1.0 1.0",
    testCases: [
      { input: "0.0 2.0 -2.0 10.0 -10.0", expectedOutput: "0.5000 0.8808 0.1192 1.0000 0.0000" },
      { input: "-1.0 1.0", expectedOutput: "0.2689 0.7311" }
    ],
    starterCode: {
      python3: "import sys\nimport math\n\ndef sigmoid(arr):\n    # Write your code here\n    return []\n\nif __name__ == '__main__':\n    line = sys.stdin.read().strip()\n    if line:\n        arr = list(map(float, line.split()))\n        res = sigmoid(arr)\n        print(\" \".join(f\"{x:.4f}\" for x in res))"
    },
    acRate: "85.2",
    totalAccepted: "12K",
    totalSubmission: "14K",
    hasSolution: true,
    isPremium: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "tt_2",
    source: "tensortonic",
    leetcodeId: 3002,
    number: 3002,
    title: "Stable Softmax",
    slug: "stable-softmax",
    difficulty: "Easy",
    topics: ["Deep Learning", "Math"],
    companyTags: ["Google", "Meta", "OpenAI", "Anthropic"],
    type: "coding",
    description: "Implement a numerically stable softmax activation function. Softmax maps a vector $x$ to a probability distribution.\n\nTo prevent numerical overflow when computing $e^{x_i}$, subtract the maximum value in the vector from each element:\n\n$$\\text{softmax}(x)_i = \\frac{e^{x_i - \\max(x)}}{\\sum_j e^{x_j - \\max(x)}}$$\n\n### Input Format\nA single line containing space-separated float values.\n\n### Output Format\nA single line containing space-separated softmax values rounded to 4 decimal places.",
    hints: [
      "Find the maximum value in the input list first.",
      "Subtract the maximum value from all elements before exponentiating."
    ],
    examples: [
      {
        input: "1.0 2.0 3.0",
        output: "0.0900 0.2447 0.6652",
        explanation: "Softmax probabilities for [1, 2, 3] sum up to 1.0."
      }
    ],
    constraints: [
      "Input vector length is between 1 and 500.",
      "Vector elements are real values."
    ],
    sampleTestCase: "1.0 2.0 3.0",
    exampleTestcases: "1.0 2.0 3.0\n1000.0 1001.0 1002.0",
    testCases: [
      { input: "1.0 2.0 3.0", expectedOutput: "0.0900 0.2447 0.6652" },
      { input: "1000.0 1001.0 1002.0", expectedOutput: "0.0900 0.2447 0.6652" }
    ],
    starterCode: {
      python3: "import sys\nimport math\n\ndef softmax(arr):\n    # Write your code here\n    return []\n\nif __name__ == '__main__':\n    line = sys.stdin.read().strip()\n    if line:\n        arr = list(map(float, line.split()))\n        res = softmax(arr)\n        print(\" \".join(f\"{x:.4f}\" for x in res))"
    },
    acRate: "80.5",
    totalAccepted: "10K",
    totalSubmission: "12K",
    hasSolution: true,
    isPremium: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "tt_3",
    source: "tensortonic",
    leetcodeId: 3003,
    number: 3003,
    title: "Mean Squared Error Loss",
    slug: "mean-squared-error-loss",
    difficulty: "Easy",
    topics: ["Machine Learning", "Loss Functions"],
    companyTags: ["Google", "Meta", "Amazon", "Microsoft"],
    type: "coding",
    description: "Compute the Mean Squared Error (MSE) loss and its gradient with respect to the predictions:\n\n$$L = \\frac{1}{N} \\sum_{i=1}^{N} (y_{\\text{pred}, i} - y_i)^2$$\n\n$$\\frac{\\partial L}{\\partial y_{\\text{pred}, i}} = \\frac{2}{N} (y_{\\text{pred}, i} - y_i)$$\n\n### Input Format\n- First line: space-separated float values for predictions $y_{\\text{pred}}$.\n- Second line: space-separated float values for targets $y$.\n\n### Output Format\n- First line: MSE loss value rounded to 4 decimal places.\n- Second line: space-separated gradient values rounded to 4 decimal places.",
    hints: [
      "N is the number of elements in the prediction array.",
      "The gradient vector must have the same length as the input predictions."
    ],
    examples: [
      {
        input: "1.0 2.0 3.0\n1.5 1.8 3.2",
        output: "0.0767\n-0.3333 0.1333 -0.1333",
        explanation: "Calculated MSE is 0.0767. Gradients are computed per element."
      }
    ],
    constraints: [
      "Predictions and targets lists have equal length N, where 1 <= N <= 1000."
    ],
    sampleTestCase: "1.0 2.0 3.0\n1.5 1.8 3.2",
    exampleTestcases: "1.0 2.0 3.0\n1.5 1.8 3.2\n0.5 0.5\n0.0 1.0",
    testCases: [
      { input: "1.0 2.0 3.0\n1.5 1.8 3.2", expectedOutput: "0.0767\n-0.3333 0.1333 -0.1333" },
      { input: "0.5 0.5\n0.0 1.0", expectedOutput: "0.2500\n0.5000 -0.5000" }
    ],
    starterCode: {
      python3: "import sys\n\ndef mse_loss(y_pred, y):\n    # Write your code here\n    # Return (loss, gradients)\n    return 0.0, []\n\nif __name__ == '__main__':\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) >= 2:\n        y_pred = list(map(float, lines[0].split()))\n        y = list(map(float, lines[1].split()))\n        loss, grads = mse_loss(y_pred, y)\n        print(f\"{loss:.4f}\")\n        print(\" \".join(f\"{g:.4f}\" for g in grads))"
    },
    acRate: "78.4",
    totalAccepted: "9.2K",
    totalSubmission: "11.7K",
    hasSolution: true,
    isPremium: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "tt_4",
    source: "tensortonic",
    leetcodeId: 3004,
    number: 3004,
    title: "Binary Cross-Entropy Loss",
    slug: "binary-cross-entropy-loss",
    difficulty: "Medium",
    topics: ["Deep Learning", "Loss Functions"],
    companyTags: ["Meta", "Google", "OpenAI"],
    type: "coding",
    description: "Implement Binary Cross-Entropy (BCE) Loss. Given predicted probabilities $p \\in [0, 1]$ and true labels $y \\in \\{0, 1\\}$:\n\n$$L = -\\frac{1}{N} \\sum_{i=1}^{N} [y_i \\log(p_i) + (1 - y_i) \\log(1 - p_i)]$$\n\nTo avoid taking $\\log(0)$, clip $p$ to $[\\epsilon, 1 - \\epsilon]$ where $\\epsilon = 10^{-15}$.\n\n### Input Format\n- First line: space-separated predictions $p$ (floats between 0 and 1).\n- Second line: space-separated targets $y$ (binary integers 0 or 1).\n\n### Output Format\nBCE loss rounded to 4 decimal places.",
    hints: [
      "Use math.log() to calculate natural logarithm.",
      "Make sure you perform element-wise clipping on predictions before calculation."
    ],
    examples: [
      {
        input: "0.9 0.1 0.8\n1 0 1",
        output: "0.1446",
        explanation: "Loss is calculated using binary cross entropy equation with log clipping."
      }
    ],
    constraints: [
      "Input vectors length N is between 1 and 1000.",
      "Predictions are floats in [0, 1]. Targets are integers in {0, 1}."
    ],
    sampleTestCase: "0.9 0.1 0.8\n1 0 1",
    exampleTestcases: "0.9 0.1 0.8\n1 0 1\n0.5 0.5\n1 0",
    testCases: [
      { input: "0.9 0.1 0.8\n1 0 1", expectedOutput: "0.1446" },
      { input: "0.5 0.5\n1 0", expectedOutput: "0.6931" }
    ],
    starterCode: {
      python3: "import sys\nimport math\n\ndef bce_loss(p, y):\n    # Write your code here\n    return 0.0\n\nif __name__ == '__main__':\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) >= 2:\n        p = list(map(float, lines[0].split()))\n        y = list(map(float, lines[1].split()))\n        loss = bce_loss(p, y)\n        print(f\"{loss:.4f}\")"
    },
    acRate: "72.1",
    totalAccepted: "8K",
    totalSubmission: "11K",
    hasSolution: true,
    isPremium: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "tt_5",
    source: "tensortonic",
    leetcodeId: 3005,
    number: 3005,
    title: "One-Hot Encoding",
    slug: "one-hot-encoding",
    difficulty: "Easy",
    topics: ["Machine Learning", "Data Processing"],
    companyTags: ["Google", "Apple", "Adobe"],
    type: "coding",
    description: "Convert an array of class labels (0-indexed integers) into a 2D one-hot matrix.\n\n### Input Format\n- First line: an integer representing the number of classes.\n- Second line: space-separated integers representing the labels.\n\n### Output Format\nThe one-hot matrix where each row is printed as space-separated 0s and 1s.",
    hints: [
      "A one-hot row has all 0s except at the index equal to the class label.",
      "The length of each row must be equal to the number of classes."
    ],
    examples: [
      {
        input: "3\n0 1 2 1 0",
        output: "1 0 0\n0 1 0\n0 0 1\n0 1 0\n1 0 0",
        explanation: "Each row corresponds to the class index of the respective label."
      }
    ],
    constraints: [
      "1 <= num_classes <= 50",
      "Labels are integers between 0 and num_classes - 1."
    ],
    sampleTestCase: "3\n0 1 2 1 0",
    exampleTestcases: "3\n0 1 2 1 0\n2\n1 1 0",
    testCases: [
      { input: "3\n0 1 2 1 0", expectedOutput: "1 0 0\n0 1 0\n0 0 1\n0 1 0\n1 0 0" },
      { input: "2\n1 1 0", expectedOutput: "0 1\n0 1\n1 0" }
    ],
    starterCode: {
      python3: "import sys\n\ndef one_hot_encode(num_classes, labels):\n    # Write your code here\n    return []\n\nif __name__ == '__main__':\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) >= 2:\n        num_classes = int(lines[0].strip())\n        labels = list(map(int, lines[1].split()))\n        matrix = one_hot_encode(num_classes, labels)\n        for row in matrix:\n            print(\" \".join(map(str, row)))"
    },
    acRate: "89.5",
    totalAccepted: "15K",
    totalSubmission: "16.8K",
    hasSolution: true,
    isPremium: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "tt_6",
    source: "tensortonic",
    leetcodeId: 3006,
    number: 3006,
    title: "L1 and L2 Regularization",
    slug: "l1-and-l2-regularization",
    difficulty: "Easy",
    topics: ["Machine Learning", "Regularization"],
    companyTags: ["Meta", "Microsoft", "OpenAI"],
    type: "coding",
    description: "Compute L1 and L2 regularization penalties and their gradients with respect to weights $w$:\n\n$$L_1 = \\lambda_1 \\sum_{i} |w_i|$$\n$$L_2 = \\lambda_2 \\sum_{i} w_i^2$$\n$$\\frac{\\partial L_1}{\\partial w_i} = \\lambda_1 \\text{sign}(w_i)$$\n$$\\frac{\\partial L_2}{\\partial w_i} = 2 \\lambda_2 w_i$$\n\nNote: For $w_i = 0$, set $\\text{sign}(w_i) = 0$.\n\n### Input Format\n- First line: space-separated float values for $\\lambda_1$ and $\\lambda_2$.\n- Second line: space-separated float values for weights $w$.\n\n### Output Format\n- First line: space-separated L1 loss and L2 loss rounded to 4 decimal places.\n- Second line: space-separated L1 gradients rounded to 4 decimal places.\n- Third line: space-separated L2 gradients rounded to 4 decimal places.",
    hints: [
      "The sign function returns 1 if positive, -1 if negative, and 0 if exactly 0.",
      "The L2 gradient coefficient is 2 * lambda2 * weight."
    ],
    examples: [
      {
        input: "0.1 0.2\n1.5 -2.0 0.0 0.5",
        output: "0.4000 1.3000\n0.1000 -0.1000 0.0000 0.1000\n0.6000 -0.8000 0.0000 0.2000",
        explanation: "Computes L1 and L2 losses and gradients based on weights and lambdas."
      }
    ],
    constraints: [
      "Number of weights is between 1 and 1000.",
      "lambdas are non-negative floats."
    ],
    sampleTestCase: "0.1 0.2\n1.5 -2.0 0.0 0.5",
    exampleTestcases: "0.1 0.2\n1.5 -2.0 0.0 0.5\n0.5 0.0\n-1.0 2.0",
    testCases: [
      { input: "0.1 0.2\n1.5 -2.0 0.0 0.5", expectedOutput: "0.4000 1.3000\n0.1000 -0.1000 0.0000 0.1000\n0.6000 -0.8000 0.0000 0.2000" },
      { input: "0.5 0.0\n-1.0 2.0", expectedOutput: "1.5000 0.0000\n-0.5000 0.5000\n0.0000 0.0000" }
    ],
    starterCode: {
      python3: "import sys\n\ndef regularize(lambda1, lambda2, weights):\n    # Write your code here\n    # Return (l1_loss, l2_loss, l1_grad, l2_grad)\n    return 0.0, 0.0, [], []\n\nif __name__ == '__main__':\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) >= 2:\n        lambda1, lambda2 = map(float, lines[0].split())\n        weights = list(map(float, lines[1].split()))\n        l1_loss, l2_loss, l1_grad, l2_grad = regularize(lambda1, lambda2, weights)\n        print(f\"{l1_loss:.4f} {l2_loss:.4f}\")\n        print(\" \".join(f\"{g:.4f}\" for g in l1_grad))\n        print(\" \".join(f\"{g:.4f}\" for g in l2_grad))"
    },
    acRate: "81.6",
    totalAccepted: "7.5K",
    totalSubmission: "9.2K",
    hasSolution: true,
    isPremium: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "tt_7",
    source: "tensortonic",
    leetcodeId: 3007,
    number: 3007,
    title: "Linear Regression Gradient Update",
    slug: "linear-regression-gradient-update",
    difficulty: "Medium",
    topics: ["Machine Learning", "Optimization"],
    companyTags: ["Google", "Meta", "Bloomberg"],
    type: "coding",
    description: "Implement a single gradient descent step for Linear Regression. Given inputs $X$ (size $N \\times D$), targets $y$ (size $N$), weights $w$ (size $D$), bias $b$, and learning rate $\alpha$:\n\n$$y_{\\text{pred}} = Xw + b$$\n$$\\frac{\\partial L}{\\partial w} = \\frac{1}{N} X^T(y_{\\text{pred}} - y)$$\n$$\\frac{\\partial L}{\\partial b} = \\frac{1}{N} \\sum_{i=1}^{N}(y_{\\text{pred}, i} - y_i)$$\n$$w \\leftarrow w - \\alpha \\frac{\\partial L}{\\partial w}$$\n$$b \\leftarrow b - \\alpha \\frac{\\partial L}{\\partial b}$$\n\n### Input Format\n- First line: three values: $N$ (number of points), $D$ (number of features), and $\alpha$ (learning rate).\n- Next $N$ lines: $D$ space-separated values representing the rows of matrix $X$.\n- Next line: $N$ space-separated values representing target vector $y$.\n- Next line: $D$ space-separated values representing initial weights $w$.\n- Next line: a single float representing initial bias $b$.\n\n### Output Format\n- First line: space-separated updated weights $w$ rounded to 4 decimal places.\n- Second line: updated bias $b$ rounded to 4 decimal places.",
    hints: [
      "Predictions are computed using the dot product of X rows and w, plus the bias b.",
      "Be careful to divide the gradients by N."
    ],
    examples: [
      {
        input: "2 2 0.1\n1.0 2.0\n3.0 4.0\n5.0 11.0\n1.0 2.0\n0.5",
        output: "1.5000 3.1000\n0.9500",
        explanation: "Computes predictions, gradients and applies SGD update step."
      }
    ],
    constraints: [
      "1 <= N <= 100",
      "1 <= D <= 20",
      "alpha is a positive float."
    ],
    sampleTestCase: "2 2 0.1\n1.0 2.0\n3.0 4.0\n5.0 11.0\n1.0 2.0\n0.5",
    exampleTestcases: "2 2 0.1\n1.0 2.0\n3.0 4.0\n5.0 11.0\n1.0 2.0\n0.5\n1 1 0.5\n2.0\n5.0\n1.0\n1.0",
    testCases: [
      {
        input: "2 2 0.1\n1.0 2.0\n3.0 4.0\n5.0 11.0\n1.0 2.0\n0.5",
        expectedOutput: "1.5000 3.1000\n0.9500"
      },
      {
        input: "1 1 0.5\n2.0\n5.0\n1.0\n1.0",
        expectedOutput: "3.0000\n2.0000"
      }
    ],
    starterCode: {
      python3: "import sys\n\ndef gd_step(X, y, w, b, alpha):\n    # Write your code here\n    # Return (updated_w, updated_b)\n    return w, b\n\nif __name__ == '__main__':\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) > 0:\n        parts = lines[0].split()\n        N = int(parts[0])\n        D = int(parts[1])\n        alpha = float(parts[2])\n        \n        X = []\n        for i in range(1, N + 1):\n            X.append(list(map(float, lines[i].split())))\n            \n        y = list(map(float, lines[N + 1].split()))\n        w = list(map(float, lines[N + 2].split()))\n        b = float(lines[N + 3].strip())\n        \n        up_w, up_b = gd_step(X, y, w, b, alpha)\n        print(\" \".join(f\"{x:.4f}\" for x in up_w))\n        print(f\"{up_b:.4f}\")"
    },
    acRate: "68.2",
    totalAccepted: "6.1K",
    totalSubmission: "9K",
    hasSolution: true,
    isPremium: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "tt_8",
    source: "tensortonic",
    leetcodeId: 3008,
    number: 3008,
    title: "ReLU and LeakyReLU",
    slug: "relu-and-leaky-relu",
    difficulty: "Easy",
    topics: ["Deep Learning", "Activations"],
    companyTags: ["Google", "Meta", "Tesla"],
    type: "coding",
    description: "Implement ReLU and LeakyReLU activation functions along with their gradients.\n\nReLU:\n$$f(x) = \\max(0, x)$$\n$$f'(x) = 1 \\text{ if } x > 0 \\text{ else } 0$$\n\nLeakyReLU:\n$$g(x) = x \\text{ if } x > 0 \\text{ else } \\alpha x$$\n$$g'(x) = 1 \\text{ if } x > 0 \\text{ else } \\alpha$$\n\n### Input Format\n- First line: a float representing the leak slope $\\alpha$.\n- Second line: space-separated floats representing inputs $x$.\n\n### Output Format\n- First line: space-separated ReLU outputs rounded to 4 decimal places.\n- Second line: space-separated ReLU gradients rounded to 4 decimal places.\n- Third line: space-separated LeakyReLU outputs rounded to 4 decimal places.\n- Fourth line: space-separated LeakyReLU gradients rounded to 4 decimal places.",
    hints: [
      "In ReLU gradient, for x = 0, the gradient is 0.",
      "In LeakyReLU gradient, for x <= 0, the gradient is alpha."
    ],
    examples: [
      {
        input: "0.01\n1.5 -2.0 0.0",
        output: "1.5000 0.0000 0.0000\n1.0000 0.0000 0.0000\n1.5000 -0.0200 0.0000\n1.0000 0.0100 0.0100",
        explanation: "Computes activations and gradients for standard ReLU and LeakyReLU."
      }
    ],
    constraints: [
      "Input vector length is between 1 and 1000.",
      "alpha is a float, typically between 0.0 and 0.5."
    ],
    sampleTestCase: "0.01\n1.5 -2.0 0.0",
    exampleTestcases: "0.01\n1.5 -2.0 0.0\n0.1\n-5.0 5.0",
    testCases: [
      { input: "0.01\n1.5 -2.0 0.0", expectedOutput: "1.5000 0.0000 0.0000\n1.0000 0.0000 0.0000\n1.5000 -0.0200 0.0000\n1.0000 0.0100 0.0100" },
      { input: "0.1\n-5.0 5.0", expectedOutput: "0.0000 5.0000\n0.0000 1.0000\n-0.5000 5.0000\n0.1000 1.0000" }
    ],
    starterCode: {
      python3: "import sys\n\ndef activations(alpha, inputs):\n    # Write your code here\n    # Return (relu_out, relu_grad, leaky_out, leaky_grad)\n    return [], [], [], []\n\nif __name__ == '__main__':\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) >= 2:\n        alpha = float(lines[0].strip())\n        inputs = list(map(float, lines[1].split()))\n        r_out, r_grad, l_out, l_grad = activations(alpha, inputs)\n        print(\" \".join(f\"{x:.4f}\" for x in r_out))\n        print(\" \".join(f\"{x:.4f}\" for x in r_grad))\n        print(\" \".join(f\"{x:.4f}\" for x in l_out))\n        print(\" \".join(f\"{x:.4f}\" for x in l_grad))"
    },
    acRate: "88.2",
    totalAccepted: "11K",
    totalSubmission: "12.5K",
    hasSolution: true,
    isPremium: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "tt_9",
    source: "tensortonic",
    leetcodeId: 3009,
    number: 3009,
    title: "K-Means Centroid Update",
    slug: "k-means-centroid-update",
    difficulty: "Medium",
    topics: ["Machine Learning", "Clustering"],
    companyTags: ["Meta", "Amazon", "Uber"],
    type: "coding",
    description: "Given $N$ points in 2D space and their current cluster assignments (from $0$ to $K-1$), calculate the new coordinates of the centroids.\n\nThe centroid of a cluster is the mean of all points assigned to it. If a cluster has no points assigned to it, its centroid coordinates should be defaulted to $(0.0, 0.0)$.\n\n### Input Format\n- First line: space-separated integers $N$ (number of points) and $K$ (number of clusters).\n- Next $N$ lines: three values representing the point's $x$-coordinate, $y$-coordinate, and assigned `cluster_id` ($0 \\le \\text{cluster\\_id} < K$).\n\n### Output Format\n$K$ lines where the $i$-th line represents the updated coordinates of the $i$-th centroid ($x$ and $y$ space-separated, rounded to 4 decimal places).",
    hints: [
      "Group the points by their cluster_id.",
      "Calculate the average of x coordinates and y coordinates separately for each cluster."
    ],
    examples: [
      {
        input: "5 2\n1.0 1.0 0\n1.5 2.0 0\n3.0 3.0 1\n4.0 4.0 1\n5.0 5.0 1",
        output: "1.2500 1.5000\n4.0000 4.0000",
        explanation: "Cluster 0 has points (1.0, 1.0) and (1.5, 2.0), averaging to (1.25, 1.5)."
      }
    ],
    constraints: [
      "1 <= N <= 2000",
      "1 <= K <= 20"
    ],
    sampleTestCase: "5 2\n1.0 1.0 0\n1.5 2.0 0\n3.0 3.0 1\n4.0 4.0 1\n5.0 5.0 1",
    exampleTestcases: "5 2\n1.0 1.0 0\n1.5 2.0 0\n3.0 3.0 1\n4.0 4.0 1\n5.0 5.0 1\n3 3\n10.0 20.0 0\n20.0 10.0 0\n5.0 5.0 2",
    testCases: [
      {
        input: "5 2\n1.0 1.0 0\n1.5 2.0 0\n3.0 3.0 1\n4.0 4.0 1\n5.0 5.0 1",
        expectedOutput: "1.2500 1.5000\n4.0000 4.0000"
      },
      {
        input: "3 3\n10.0 20.0 0\n20.0 10.0 0\n5.0 5.0 2",
        expectedOutput: "15.0000 15.0000\n0.0000 0.0000\n5.0000 5.0000"
      }
    ],
    starterCode: {
      python3: "import sys\n\ndef update_centroids(N, K, points):\n    # Write your code here\n    # points is a list of tuples: (x, y, cluster_id)\n    # Return a list of tuples: (centroid_x, centroid_y) for each cluster 0 to K-1\n    return [(0.0, 0.0)] * K\n\nif __name__ == '__main__':\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) > 0:\n        N, K = map(int, lines[0].split())\n        points = []\n        for i in range(1, N + 1):\n            parts = lines[i].split()\n            points.append((float(parts[0]), float(parts[1]), int(parts[2])))\n        centroids = update_centroids(N, K, points)\n        for c_x, c_y in centroids:\n            print(f\"{c_x:.4f} {c_y:.4f}\")"
    },
    acRate: "70.1",
    totalAccepted: "4.5K",
    totalSubmission: "6.4K",
    hasSolution: true,
    isPremium: false,
    createdAt: new Date().toISOString()
  },
  {
    id: "tt_10",
    source: "tensortonic",
    leetcodeId: 3010,
    number: 3010,
    title: "Adam Optimizer Step",
    slug: "adam-optimizer-step",
    difficulty: "Hard",
    topics: ["Deep Learning", "Optimization"],
    companyTags: ["OpenAI", "Google", "Meta", "Anthropic"],
    type: "coding",
    description: "Implement a single parameter update step of the Adam (Adaptive Moment Estimation) optimizer.\n\nFormulas:\n$$g_t = \\nabla L(w_t)$$\n$$m_t = \\beta_1 m_{t-1} + (1 - \\beta_1) g_t$$\n$$v_t = \\beta_2 v_{t-1} + (1 - \\beta_2) g_t^2$$\n$$\\hat{m}_t = \\frac{m_t}{1 - \\beta_1^t}$$\n$$\\hat{v}_t = \\frac{v_t}{1 - \\beta_2^t}$$\n$$w_{t+1} = w_t - \\frac{\\alpha}{\\sqrt{\\hat{v}_t} + \\epsilon} \\hat{m}_t$$\n\n### Input Format\n- First line: step index $t$, learning rate $\\alpha$, $\\beta_1$, $\\beta_2$, and $\\epsilon$.\n- Second line: space-separated initial weights $w_{t-1}$.\n- Third line: space-separated gradients $g_t$.\n- Fourth line: space-separated first moment vector $m_{t-1}$.\n- Fifth line: space-separated second moment vector $v_{t-1}$.\n\n### Output Format\n- First line: space-separated updated weights $w_t$ rounded to 4 decimal places.\n- Second line: space-separated updated first moments $m_t$ rounded to 4 decimal places.\n- Third line: space-separated updated second moments $v_t$ rounded to 4 decimal places.",
    hints: [
      "Do not forget that the bias corrections scale by 1 - beta1^t and 1 - beta2^t.",
      "The computation should be done element-wise for vectors w, g, m, and v."
    ],
    examples: [
      {
        input: "1 0.001 0.9 0.999 1e-8\n0.5 -0.2\n0.1 -0.5\n0.0 0.0\n0.0 0.0",
        output: "0.4990 -0.1990\n0.0100 -0.0500\n0.0001 0.0002",
        explanation: "Applies Adam algorithm formulas element-wise."
      }
    ],
    constraints: [
      "Number of weights D is between 1 and 1000.",
      "step t >= 1."
    ],
    sampleTestCase: "1 0.001 0.9 0.999 1e-8\n0.5 -0.2\n0.1 -0.5\n0.0 0.0\n0.0 0.0",
    exampleTestcases: "1 0.001 0.9 0.999 1e-8\n0.5 -0.2\n0.1 -0.5\n0.0 0.0\n0.0 0.0\n2 0.01 0.9 0.999 1e-8\n0.499 -0.199\n0.08 -0.4\n0.01 -0.05\n0.0001 0.0002",
    testCases: [
      {
        input: "1 0.001 0.9 0.999 1e-8\n0.5 -0.2\n0.1 -0.5\n0.0 0.0\n0.0 0.0",
        expectedOutput: "0.4990 -0.1990\n0.0100 -0.0500\n0.0001 0.0002"
      },
      {
        input: "2 0.01 0.9 0.999 1e-8\n0.499 -0.199\n0.08 -0.4\n0.01 -0.05\n0.0001 0.0002",
        expectedOutput: "0.4791 -0.1790\n0.0170 -0.0850\n0.0002 0.0004"
      }
    ],
    starterCode: {
      python3: "import sys\nimport math\n\ndef adam_step(t, alpha, beta1, beta2, epsilon, w, g, m, v):\n    # Write your code here\n    # Return (updated_w, updated_m, updated_v)\n    return w, m, v\n\nif __name__ == '__main__':\n    lines = sys.stdin.read().strip().split('\\n')\n    if len(lines) >= 5:\n        parts = lines[0].split()\n        t = int(parts[0])\n        alpha = float(parts[1])\n        beta1 = float(parts[2])\n        beta2 = float(parts[3])\n        epsilon = float(parts[4])\n        \n        w = list(map(float, lines[1].split()))\n        g = list(map(float, lines[2].split()))\n        m = list(map(float, lines[3].split()))\n        v = list(map(float, lines[4].split()))\n        \n        up_w, up_m, up_v = adam_step(t, alpha, beta1, beta2, epsilon, w, g, m, v)\n        print(\" \".join(f\"{x:.4f}\" for x in up_w))\n        print(\" \".join(f\"{x:.4f}\" for x in up_m))\n        print(\" \".join(f\"{x:.4f}\" for x in up_v))"
    },
    acRate: "55.4",
    totalAccepted: "3.2K",
    totalSubmission: "5.8K",
    hasSolution: true,
    isPremium: false,
    createdAt: new Date().toISOString()
  }
];

async function main() {
  console.log('📖 Loading local problems file...');
  if (!fs.existsSync(PROBLEMS_FILE)) {
    console.error(`❌ ${PROBLEMS_FILE} not found.`);
    process.exit(1);
  }

  let problems = [];
  try {
    problems = JSON.parse(fs.readFileSync(PROBLEMS_FILE, 'utf8'));
  } catch (err) {
    console.error('❌ Failed to parse problems file:', err);
    process.exit(1);
  }

  // Filter out any existing tt_ problems to avoid duplicates
  problems = problems.filter(p => !p.id.startsWith('tt_'));

  // Append new TensorTonic problems
  const updatedProblems = [...problems, ...tensorTonicProblems];

  // Sort by leetcodeId / number
  updatedProblems.sort((a, b) => a.number - b.number);

  console.log(`✍️ Writing updated problems to local JSON...`);
  fs.writeFileSync(PROBLEMS_FILE, JSON.stringify(updatedProblems, null, 2));
  console.log(`✅ Appended ${tensorTonicProblems.length} TensorTonic problems locally.`);

  // Write to Firestore
  if (!fs.existsSync(SA_PATH)) {
    console.error(`❌ Service account key not found at: ${SA_PATH}`);
    process.exit(1);
  }

  const serviceAccount = require(SA_PATH);
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }

  const db = admin.firestore();
  console.log(`🚀 Uploading new problems to Firestore...`);

  const batch = db.batch();
  tensorTonicProblems.forEach(problem => {
    const ref = db.collection('problems').doc(problem.id);
    batch.set(ref, problem, { merge: true });
  });

  await batch.commit();
  console.log(`✅ Uploaded ${tensorTonicProblems.length} problems to Firestore.`);
}

main().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
