/**
 * 配列から指定されたインデックスの要素を取得します。
 * この関数は元の配列を変更しません。
 *
 * @param {Array} arr - 元の配列
 * @param {Array} indices - 取得する要素のインデックスの配列
 * @returns {Array} - 取得した要素の配列
 */
function getElementsFromArray(arr, indices) {
    // map関数を使用して、インデックスに対応する要素を返す新しい配列を作成します
    return indices.map(index => arr[index])
}


/**
 * 配列をシャッフルします。この関数は元の配列を直接変更します。
 * 元の配列が必要な場合は、関数を呼び出す前に配列のコピーを作成してください。
 *
 * @param {Array} array - シャッフルする配列
 */
function shuffleArray(array) {
    // 配列の最後の要素から始めて、最初の要素まで反復します
    for (let i = array.length - 1; i > 0; i--) {
        // 0からiまでのランダムな整数を生成します
        let j = Math.floor(Math.random() * (i + 1));
        // i番目とj番目の要素を交換します（分割代入を使用）
        [array[i], array[j]] = [array[j], array[i]];
    }
}


/**
 * 配列から特定の要素のインデックスを取得します。
 * 要素が見つからない場合は-1を返します。
 *
 * @param {Array} arr - 検索する配列
 * @param {number} num - 配列内で検索する数値
 * @returns {number} - 要素のインデックス、または-1
 */
function findIndex(arr, num) {
    return arr.indexOf(num);
}


let answerButtons = Array.from(document.getElementsByClassName("fe-answer-button"))
answerButtons.forEach((answerButton) => {
    let targetArticle = answerButton.parentElement.parentElement
    let ansAreas = Array.from(targetArticle.getElementsByClassName("tf"))
    let questions = Array.from(targetArticle.getElementsByClassName("question-sentences"))
    let answersData = Array.from(targetArticle.getElementsByClassName("ans-data"))
    let answers = []

    questions.forEach((element, index) => {
        let questionList = Array.from(element.children)
        let indices = Array.from({ length: questionList.length }, (_, i) => i)
        shuffleArray(indices)
        let shuffledQuestionsList = getElementsFromArray(questionList, indices)
        Array.from(element.children).forEach((li) => {
            element.removeChild(li)
        })
        shuffledQuestionsList.forEach((li) => {
            element.appendChild(li)
        })
        answers = answers.concat([findIndex(indices, parseInt(answersData[index].innerText)) + 1])
    })

    answerButton.addEventListener('click', () => {
        let userAnswers = Array.from(targetArticle.getElementsByClassName("user-ans"))
        userAnswers.forEach((e, i) => {
            let userAns = e.selectedIndex
            if (answers[i] == userAns) {
                ansAreas[i].innerHTML = "<strong class='accent'>正解</strong>"
            } else {
                ansAreas[i].innerHTML = "<strong>不正解</strong>"
            }
        })
    })
})

