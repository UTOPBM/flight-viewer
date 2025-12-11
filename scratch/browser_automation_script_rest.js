// 1. 파트너 센터의 '링크 생성' 페이지(https://partner.myrealtrip.com/partnership-marketing/link-generator)에서 F12를 눌러 콘솔을 엽니다.
// 2. 아래 코드를 복사해서 붙여넣고 엔터를 치세요.
// 3. 작업량이 많으므로 브라우저 탭을 끄지 말고 기다려주세요!

(async () => {
    // DB에서 추출한 변환 대상 URL 리스트 (1000개+)
    const urlsToConvert = [
        "https://experiences.myrealtrip.com/products/4887870",
        "https://experiences.myrealtrip.com/products/4848494",
        "https://experiences.myrealtrip.com/products/4400708",
        "https://experiences.myrealtrip.com/products/4249566",
        "https://experiences.myrealtrip.com/products/4888043",
        "https://experiences.myrealtrip.com/products/4179659",
        "https://www.myrealtrip.com/offers/170147",
        "https://experiences.myrealtrip.com/products/4860788",
        "https://experiences.myrealtrip.com/products/5529651",
        "https://experiences.myrealtrip.com/products/4660992",
        "https://experiences.myrealtrip.com/products/3754130",
        "https://experiences.myrealtrip.com/products/5509215",
        "https://experiences.myrealtrip.com/products/3443057",
        "https://experiences.myrealtrip.com/products/3917625",
        "https://experiences.myrealtrip.com/products/3852659",
        "https://experiences.myrealtrip.com/products/3881307",
        "https://experiences.myrealtrip.com/products/3860968",
        "https://experiences.myrealtrip.com/products/3903428",
        "https://experiences.myrealtrip.com/products/4254375",
        "https://experiences.myrealtrip.com/products/3880490",
        "https://experiences.myrealtrip.com/products/3860822",
        "https://experiences.myrealtrip.com/products/3881010",
        "https://experiences.myrealtrip.com/products/3881102",
        "https://experiences.myrealtrip.com/products/3753802",
        "https://experiences.myrealtrip.com/products/3881311",
        "https://experiences.myrealtrip.com/products/3881309",
        "https://experiences.myrealtrip.com/products/3880819",
        "https://www.myrealtrip.com/offers/66003",
        "https://experiences.myrealtrip.com/products/3885945",
        "https://experiences.myrealtrip.com/products/3880680",
        "https://experiences.myrealtrip.com/products/3885584",
        "https://experiences.myrealtrip.com/products/3881308",
        "https://experiences.myrealtrip.com/products/3650240",
        "https://experiences.myrealtrip.com/products/4148907",
        "https://experiences.myrealtrip.com/products/3735543",
        "https://www.myrealtrip.com/offers/159901",
        "https://experiences.myrealtrip.com/products/3735545",
        "https://experiences.myrealtrip.com/products/3886916",
        "https://experiences.myrealtrip.com/products/4139355",
        "https://experiences.myrealtrip.com/products/4433228",
        "https://experiences.myrealtrip.com/products/3911799",
        "https://experiences.myrealtrip.com/products/4614357",
        "https://experiences.myrealtrip.com/products/4947449",
        "https://experiences.myrealtrip.com/products/4845739",
        "https://experiences.myrealtrip.com/products/3880740",
        "https://experiences.myrealtrip.com/products/3881285",
        "https://experiences.myrealtrip.com/products/3859862",
        "https://experiences.myrealtrip.com/products/4136767",
        "https://experiences.myrealtrip.com/products/3921833",
        "https://www.myrealtrip.com/offers/80578",
        "https://experiences.myrealtrip.com/products/3886810",
        "https://experiences.myrealtrip.com/products/3858593",
        "https://experiences.myrealtrip.com/products/3792825",
        "https://experiences.myrealtrip.com/products/4201507",
        "https://experiences.myrealtrip.com/products/3650242",
        "https://www.myrealtrip.com/offers/137292",
        "https://experiences.myrealtrip.com/products/5505184",
        "https://experiences.myrealtrip.com/products/4974695",
        "https://experiences.myrealtrip.com/products/3881306",
        "https://experiences.myrealtrip.com/products/3735536",
        "https://experiences.myrealtrip.com/products/3881256",
        "https://experiences.myrealtrip.com/products/4985184",
        "https://experiences.myrealtrip.com/products/3886501",
        "https://experiences.myrealtrip.com/products/3828970",
        "https://experiences.myrealtrip.com/products/4418023",
        "https://experiences.myrealtrip.com/products/3624095",
        "https://experiences.myrealtrip.com/products/4519537",
        "https://experiences.myrealtrip.com/products/4959818",
        "https://experiences.myrealtrip.com/products/3861108",
        "https://experiences.myrealtrip.com/products/3424963",
        "https://experiences.myrealtrip.com/products/4890214",
        "https://experiences.myrealtrip.com/products/3861106",
        "https://experiences.myrealtrip.com/products/3886518"
    ];

    const results = [];
    const delay = ms => new Promise(res => setTimeout(res, ms));

    const findButtonByText = (text) => {
        const spans = Array.from(document.querySelectorAll('span'));
        const targetSpan = spans.find(s => s.innerText.trim() === text);
        return targetSpan ? targetSpan.closest('button') : null;
    };

    const getLinkSpans = () => Array.from(document.querySelectorAll('span[class*="ProductLink"]'));

    console.log(`🚀 대규모 작업 시작: 총 ${urlsToConvert.length}개 링크 변환 예정`);

    for (let i = 0; i < urlsToConvert.length; i++) {
        const originalUrl = urlsToConvert[i];

        // 진행률 표시
        if (i % 10 === 0) {
            console.log(`⚡ 진행률: ${Math.round((i / urlsToConvert.length) * 100)}% ([${i + 1}/${urlsToConvert.length}])`);
        } else {
            console.log(`[${i + 1}/${urlsToConvert.length}] 진행 중...`);
        }

        try {
            const prevSpans = getLinkSpans();
            const prevTopLinkText = prevSpans.length > 0 ? prevSpans[0].innerText : "";

            const input = document.querySelector('input.css-6nib36');
            if (!input) throw new Error("입력창을 찾을 수 없습니다.");

            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(input, originalUrl);
            input.dispatchEvent(new Event('input', { bubbles: true }));

            await delay(400); // 딜레이 약간 여유있게

            // 버튼 클릭 로직
            const generateBtn = findButtonByText('홍보 링크 만들기');
            if (generateBtn) {
                generateBtn.click();
            } else {
                input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
            }

            // 대기 로직 (최대 12초)
            let foundLink = "";
            for (let attempt = 0; attempt < 60; attempt++) {
                await delay(200);
                const currentSpans = getLinkSpans();
                const currentTopLinkText = currentSpans.length > 0 ? currentSpans[0].innerText : "";

                if (currentTopLinkText && currentTopLinkText !== prevTopLinkText && currentTopLinkText.includes('myrealt')) {
                    foundLink = currentTopLinkText;
                    break;
                }
            }

            if (foundLink) {
                // 성공 로그는 너무 많으면 콘솔 지저분하니까 생략하거나 짧게
                // console.log(`✅ 성공: ${foundLink}`);
                results.push({ original_url: originalUrl, partner_url: foundLink });
            } else {
                console.warn(`⚠️ 실패/시간초과: ${originalUrl}`);
                // 실패해도 멈추지 않고 계속!
            }

            // 초기화
            const resetBtn = findButtonByText('링크 다시 만들기');
            if (resetBtn) {
                resetBtn.click();
                await delay(300);
            }

        } catch (e) {
            console.error(`❌ 치명적 에러:`, e);
            // 에러나도 일단 계속
        }

        await delay(300); // 쿨다운
    }

    console.log("🎉 모든 작업 완료! 결과 파일을 저장합니다.");

    const dataStr = JSON.stringify(results, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "affiliate_links_rest_result.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
})();
